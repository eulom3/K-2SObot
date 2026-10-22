<?php
require 'config.php';
require 'auth.php';
header('Content-Type: application/json');
$rows = db()->query('SELECT koc_id, target_name, reason, status, added_by FROM war_targets WHERE status = "active" ORDER BY id DESC LIMIT 100')->fetchAll();
echo json_encode($rows);
