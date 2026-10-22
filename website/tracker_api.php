<?php
require 'config.php';
require 'auth.php';
header('Content-Type: application/json');
$rows = db()->query('SELECT t.koc_id, n.name, t.metric, t.value, t.captured_at FROM tracker_entries t
  JOIN (SELECT koc_id, metric, MAX(id) mx FROM tracker_entries GROUP BY koc_id, metric) latest
    ON latest.mx = t.id
  LEFT JOIN intel_names n ON n.koc_id = t.koc_id
  ORDER BY t.koc_id, t.metric LIMIT 500')->fetchAll();
echo json_encode($rows);
