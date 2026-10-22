<?php
require 'config.php';
require 'auth.php';
header('Content-Type: application/json');
$rows = db()->query('SELECT s.message, s.created_at, m.username FROM shouts s
                     JOIN members m ON m.id = s.member_id
                     ORDER BY s.id DESC LIMIT 50')->fetchAll();
$out = [];
foreach (array_reverse($rows) as $r) {
    $out[] = ['username' => $r['username'],
              'message'  => nl2br(htmlspecialchars($r['message'], ENT_QUOTES)),
              'created_at' => date('M j, g:ia', strtotime($r['created_at']))];
}
echo json_encode($out);
