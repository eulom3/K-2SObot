
// ==UserScript==
// @name         jedidatabasetest
// @namespace    Jedi
// @version      1.4
// @description  Import Battlefield player data into the FLG stats database, including AJAX navigation
// @match        https://www.kingsofchaos.com/battlefield.php*
// @grant        GM_xmlhttpRequest
// @connect      15.204.44.25
// ==/UserScript==

(function () {
    'use strict';

    const API_URL = 'http://15.204.44.25:50007/api/stats';
    const API_KEY = 'sk_live_wZzVfXM1OrwajOKqOezCVXbZrGXsIzNH';
    const CLICK_DELAY = 1000;

    let requestInProgress = false;
    let pendingImport = false;
    let lastData = '';

    function getAllianceId(row) {
        const allianceLink = row.querySelector('td:nth-child(2) a');
        if (!allianceLink) return 0;

        const match = allianceLink.href.match(/[?&]id=(\d+)/);
        return match ? Number(match[1]) : 0;
    }

    function getPlayerData(row) {
        const cells = row.querySelectorAll('td');
        const playerId = Number(row.getAttribute('user_id'));
        const nameLink = row.querySelector('td:nth-child(3) a.player');

        if (!playerId || !nameLink || cells.length < 8) {
            return null;
        }

        return {
            id: playerId,
            name: nameLink.textContent.trim(),
            alliance: cells[1].textContent.trim() || null,
            alliance_id: cells[1].textContent.trim() ? getAllianceId(row) || null : null,
            tff: Number(cells[3].textContent.replace(/,/g, '').trim()),
            race: cells[4].textContent.trim()
        };
    }

    function sendPlayers(players, payload) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: API_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                data: payload,
                timeout: 60000,

                onload: function (response) {
                    resolve({
                        success: response.status >= 200 &&
                                 response.status < 300,
                        status: response.status,
                        response: response.responseText
                    });
                },

                onerror: function () {
                    resolve({
                        success: false,
                        status: 'Network error'
                    });
                },

                ontimeout: function () {
                    resolve({
                        success: false,
                        status: 'Timeout'
                    });
                }
            });
        });
    }

    async function importBattlefieldStats() {
        if (requestInProgress) {
            pendingImport = true;
            return;
        }

        const players = Array.from(
            document.querySelectorAll('tr.player')
        )
            .map(getPlayerData)
            .filter(Boolean);

        if (players.length === 0) {
            console.log('[FLG Import] No valid player rows found.');
            return;
        }

        const payload = JSON.stringify(players, null, 2);

        if (payload === lastData) {
            console.log('[FLG Import] Data unchanged; skipping request.');
            return;
        }

        console.group(`[FLG Import] Sending ${players.length} players`);
        console.log('API URL:', API_URL);
        console.log('Player count:', players.length);
        console.log('Exact JSON payload sent:');
        console.log(payload);
        console.groupEnd();

        requestInProgress = true;

        try {
            const result = await sendPlayers(players, payload);

            if (result.success) {
                lastData = payload;
                console.log('[FLG Import] Success');
                console.log('HTTP status:', result.status);
                console.log('API response:', result.response);
            } else {
                console.error('[FLG Import] Failed');
                console.error('HTTP status:', result.status);
                console.error('API response:', result.response || '');
            }
        } catch (error) {
            console.error('[FLG Import] Error:', error);
        } finally {
            requestInProgress = false;

            if (pendingImport) {
                pendingImport = false;
                importBattlefieldStats();
            }
        }
    }

    function scheduleImport() {
        setTimeout(importBattlefieldStats, CLICK_DELAY);
    }

    // Initial page load.
    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            scheduleImport,
            { once: true }
        );
    } else {
        scheduleImport();
    }

    // Recheck after clicks for AJAX navigation.
    document.addEventListener('click', function () {
        scheduleImport();
    }, true);

})();
