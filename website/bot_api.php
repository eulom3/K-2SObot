<?php
// Endpoint for your Discord bot / alliance script to push data into the site.
// Auth: POST header "X-Bot-Token: YOUR_BOT_TOKEN"  (set in config.php)
require 'config.php';
header('Content-Type: application/json');

if (($_SERVER['HTTP_X_BOT_TOKEN'] ?? '') !== BOT_TOKEN) {
    http_response_code(403); echo json_encode(['ok' => false, 'error' => 'bad token']); exit;
}
$in = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$action = $in['action'] ?? '';

try {
    switch ($action) {
        case 'add_target':
            db()->prepare('INSERT INTO war_targets (koc_id, target_name, reason, added_by) VALUES (?,?,?,?)')
                ->execute([(int)$in['koc_id'], $in['target_name'] ?? '', $in['reason'] ?? '', 'discord-bot']);
            echo json_encode(['ok' => true]); break;

        case 'clear_target':
            db()->prepare('UPDATE war_targets SET status = "cleared" WHERE koc_id = ?')
                ->execute([(int)$in['koc_id']]);
            echo json_encode(['ok' => true]); break;

        case 'tracker_push':
            // Accepts a single reading OR a batch from the Tiv tracker:
            // {"action":"tracker_push","koc_id":12345,"metric":"tff","value":"1,240,000"}
            // {"action":"tracker_push","entries":[{"koc_id":1,"metric":"tff","value":"..."}, ...]}
            $entries = $in['entries'] ?? [$in];
            $stmt = db()->prepare('INSERT INTO tracker_entries (koc_id, metric, value) VALUES (?,?,?)');
            foreach ($entries as $e) {
                if (!empty($e['koc_id']) && !empty($e['metric'])) $stmt->execute([(int)$e['koc_id'], substr($e['metric'],0,32), substr((string)$e['value'],0,64)]);
            }
            echo json_encode(['ok' => true, 'stored' => count($entries)]); break;

        case 'warscout_push':
            // Native JFWarScout payload: the script's boardPack() output
            // {"tiv": {"123": {"id":"123","name":"Enemy","invested":4500000,"at":...}},
            //  "targets": {"123": {"name":"Enemy","sa":...,"da":...,"at":...}}}
            $stored = 0;
            $ins  = db()->prepare('INSERT INTO tracker_entries (koc_id, metric, value) VALUES (?,?,?)');
            $name = ($GLOBALS['DB_DRIVER'] ?? 'mysql') === 'sqlite'
                ? db()->prepare('INSERT OR REPLACE INTO intel_names (koc_id, name) VALUES (?,?)')
                : db()->prepare('INSERT INTO intel_names (koc_id, name) VALUES (?,?) ON DUPLICATE KEY UPDATE name = VALUES(name)');
            foreach (($in['tiv'] ?? []) as $id => $row) {
                if (empty($row['invested'])) continue;
                $kid = (int)$id;
                $ins->execute([$kid, 'tiv', (string)$row['invested']]); $stored++;
                if (!empty($row['name'])) $name->execute([$kid, substr($row['name'],0,64)]);
            }
            $STATS = ['sa','da','spy','sentry','poison','antidote','theft','vigilance'];
            $insAt = db()->prepare('INSERT INTO tracker_entries (koc_id, metric, value, captured_at) VALUES (?,?,?,'.ts_expr('?').')');
            foreach (($in['targets'] ?? []) as $id => $t) {
                $kid = (int)($t['id'] ?? $id); if (!$kid) continue;
                foreach ($STATS as $s) {
                    if (!empty($t[$s])) { $ins->execute([$kid, $s, (string)$t[$s]]); $stored++; }
                    if (!empty($t['tech'][$s]))   { $ins->execute([$kid, 'tech_'.$s,   (string)$t['tech'][$s]]);   $stored++; }
                    if (!empty($t['units'][$s]))  { $ins->execute([$kid, 'units_'.$s,  (string)$t['units'][$s]]);  $stored++; }
                    if (!empty($t['weapons'][$s])){ $ins->execute([$kid, 'weapons_'.$s,(string)$t['weapons'][$s]]);$stored++; }
                }
                if (!empty($t['name'])) $name->execute([$kid, substr($t['name'],0,64)]);
            }
            // histlog: full 48h per-target time series -> captured_at preserved
            foreach (($in['histlog'] ?? []) as $id => $rows) {
                $kid = (int)$id; if (!$kid || !is_array($rows)) continue;
                foreach ($rows as $r) {
                    if (empty($r['at'])) continue;
                    foreach ($STATS as $s) {
                        if (!empty($r[$s])) { $insAt->execute([$kid, $s, (string)$r[$s], (int)$r['at']]); $stored++; }
                    }
                }
            }
            // stolen: faction gold-loss ledger (deduped by gold+when)
            $ign = ($GLOBALS['DB_DRIVER'] ?? 'mysql') === 'sqlite' ? 'OR IGNORE' : 'IGNORE';
            $steal = db()->prepare('INSERT '.$ign.' INTO steal_events (gold, when_txt, at) VALUES (?,?,'.ts_expr('?').')');
            foreach (($in['stolen'] ?? []) as $r) {
                if (empty($r['gold'])) continue;
                $steal->execute([(int)$r['gold'], substr($r['when'] ?? '',0,64), (int)($r['at'] ?? time()*1000)]);
            }
            echo json_encode(['ok' => true, 'stored' => $stored]); break;

        case 'get_targets':
            echo json_encode(['ok' => true,
                'targets' => db()->query('SELECT koc_id, target_name, reason, added_by, created_at FROM war_targets WHERE status="active" ORDER BY id DESC LIMIT 50')->fetchAll()]);
            break;

        case 'get_pending':
            echo json_encode(['ok' => true,
                'pending' => db()->query('SELECT username, koc_id, verify_code, created_at FROM members WHERE status="pending" ORDER BY created_at')->fetchAll()]);
            break;

        case 'get_tiv_top':
            $lim = min(25, max(1, (int)($in['limit'] ?? 10)));
            echo json_encode(['ok' => true,
                'tiv' => db()->query("SELECT t.koc_id, n.name, t.value, t.captured_at FROM tracker_entries t
                    JOIN (SELECT koc_id, metric, MAX(id) mx FROM tracker_entries WHERE metric='tiv' GROUP BY koc_id, metric) latest ON latest.mx = t.id
                    LEFT JOIN intel_names n ON n.koc_id = t.koc_id
                    ORDER BY CAST(t.value AS UNSIGNED) DESC LIMIT $lim")->fetchAll()]);
            break;

        case 'get_player':
            $kid = (int)($in['koc_id'] ?? 0); if (!$kid) { echo json_encode(['ok'=>false,'error'=>'koc_id required']); break; }
            $stmt = db()->prepare("SELECT t.metric, t.value, t.captured_at FROM tracker_entries t
                JOIN (SELECT koc_id, metric, MAX(id) mx FROM tracker_entries WHERE koc_id=? GROUP BY koc_id, metric) latest ON latest.mx = t.id
                WHERE t.koc_id = ? ORDER BY t.metric");
            $stmt->execute([$kid, $kid]);
            echo json_encode(['ok' => true, 'koc_id' => $kid, 'stats' => $stmt->fetchAll()]);
            break;

        case 'member_count':
            echo json_encode(['ok' => true,
                'approved' => db()->query('SELECT COUNT(*) c FROM members WHERE status="approved"')->fetch()['c'],
                'pending'  => db()->query('SELECT COUNT(*) c FROM members WHERE status="pending"')->fetch()['c']]);
            break;

        default:
            echo json_encode(['ok' => false, 'error' => 'unknown action', 'actions' => ['add_target','clear_target','tracker_push','warscout_push','get_targets','get_pending','get_tiv_top','get_player','member_count']]);
    }
} catch (Exception $e) {
    http_response_code(500); echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
