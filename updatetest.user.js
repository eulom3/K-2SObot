// ==UserScript==
// @name         JF Version update test
// @namespace    JediFaaction
// @version      9.0.1
// @description  Checks the script version against remote configuration
// @match        *://www.kingsofchaos.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @connect      jfactiongaming.com
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG_URL = 'https://jfactiongaming.com/script_config.json';
    const REDIRECT_URL = 'http://jfactiongaming.com/jfwarscout.user.js';

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
                        'Your warscout version is out of date click OK to update.\n\n' +

                        'Installed version: ' + currentVersion + '\n' +
                        'Required version: ' + remoteVersion +
                        updateNotes;

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
