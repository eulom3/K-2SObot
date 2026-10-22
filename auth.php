<?php
session_start();
function current_member() {
    if (empty($_SESSION['uid'])) return null;
    $stmt = db()->prepare('SELECT * FROM members WHERE id = ? AND status = "approved"');
    $stmt->execute([$_SESSION['uid']]);
    return $stmt->fetch() ?: null;
}
$ME = current_member();
if (!$ME) {
    $next = urlencode($_SERVER['REQUEST_URI']);
    header('Location: login.php?next=' . $next);
    exit;
}
