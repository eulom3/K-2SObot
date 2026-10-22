<?php
require 'config.php';
db(); // connect first so the driver is known
echo "Driver: <b>".($GLOBALS['DB_DRIVER'] ?? 'unknown')."</b><br><br>";

foreach (['members','shouts','war_targets','tracker_entries','intel_names','steal_events'] as $t) {
    try { $c = db()->query("SELECT COUNT(*) c FROM $t")->fetch(); echo "✔ table <b>$t</b> exists ({$c['c']} rows)<br>"; }
    catch (Exception $e) { echo "✘ table <b>$t</b> MISSING — ".$e->getMessage()."<br>"; }
}
echo "<br>Insert test (rolled back): ";
try {
    db()->beginTransaction();
    db()->exec("INSERT INTO members (username, pass_hash, koc_id, verify_code) VALUES ('__diag__','x',1,'XXXXXX')");
    db()->rollBack();
    echo "<b>OK — registration should work</b>";
} catch (Exception $e) {
    if (db()->inTransaction()) db()->rollBack();
    echo "<b style='color:#e6a8a8'>FAILED — this is your 'username taken' bug:</b> ".$e->getMessage();
}
?>