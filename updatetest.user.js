// ==UserScript==
// @name         Version Checker
// @namespace    FLG
// @version      9.0.1
// @description  Checks the script version against remote configuration
// @match        *://www.kingsofchaos.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      15.204.44.25
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG_URL = 'http://15.204.44.25:10016/script_config.json';
    const REDIRECT_URL = 'http://15.204.44.25:10016/jfwarscout.user.js';

    const currentVersion = GM_info.script.version;

    GM_xmlhttpRequest({
        method: 'GET',
        url: CONFIG_URL,

        onload: function (response) {
            if (response.status !== 200) return;

            try {
                const config = JSON.parse(response.responseText);
                const remoteVersion = String(config.version ?? '');

                if (remoteVersion && remoteVersion !== currentVersion) {
                    const history = config.history?.[remoteVersion];

                    const updateNotes = Array.isArray(history)
                        ? '\n\nUpdates:\n' + history.map(entry => '- ' + entry).join('\n')
                        : '';

                    const message =
                        'This script version is out of date.\n\n' +
                        'Installed version: ' + currentVersion + '\n' +
                        'Required version: ' + remoteVersion +
                        updateNotes +
                        '\n\nClick OK to get the updated script.';

                    if (confirm(message)) {
                        window.location.href = REDIRECT_URL;
                    }
                }
            } catch (error) {
                console.error('[Version Checker] Error:', error);
            }
        },

        onerror: function () {
            console.error('[Version Checker] Could not retrieve version configuration.');
        }
    });
})();
