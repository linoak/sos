
        const button = document.getElementById('toggleButton');
        const statusDisplay = document.getElementById('status');
        const body = document.body;

        let isRunning = false;
        let videoTrack = null;
        let timerId = null;

        // 摩斯電碼 SOS 定義
        // 短點 (dot): 1 單位時間 (e.g., 200ms)
        // 長劃 (dash): 3 單位時間 (e.g., 600ms)
        // 符號間隔: 1 單位時間
        // 字母間隔: 3 單位時間
        // 單詞間隔: 7 單位時間
        const UNIT_TIME = 200; // 基礎單位時間 (毫秒)

        // 完整的 SOS 序列：
        // S (···) + 休息 + O (---) + 休息 + S (···) + 休息 (長間隔)
        const MORSE_CODE_SEQUENCE = [
            // S (·)
            { duration: UNIT_TIME, on: true }, { duration: UNIT_TIME, on: false },
            // S (·)
            { duration: UNIT_TIME, on: true }, { duration: UNIT_TIME, on: false },
            // S (·)
            { duration: UNIT_TIME, on: true }, { duration: UNIT_TIME * 3, on: false }, // 字母間隔

            // O (-)
            { duration: UNIT_TIME * 3, on: true }, { duration: UNIT_TIME, on: false },
            // O (-)
            { duration: UNIT_TIME * 3, on: true }, { duration: UNIT_TIME, on: false },
            // O (-)
            { duration: UNIT_TIME * 3, on: true }, { duration: UNIT_TIME * 3, on: false }, // 字母間隔

            // S (·)
            { duration: UNIT_TIME, on: true }, { duration: UNIT_TIME, on: false },
            // S (·)
            { duration: UNIT_TIME, on: true }, { duration: UNIT_TIME, on: false },
            // S (·)
            { duration: UNIT_TIME, on: true }, { duration: UNIT_TIME * 7, on: false }, // 單詞間隔 (重複循環)
        ];

        // --- 核心手電筒控制函式 ---

        /**
         * 開啟/關閉手電筒 (相機閃光燈)
         * @param {boolean} state - true 為開啟, false 為關閉
         */
        async function setTorch(state) {
            if (!videoTrack) {
                // 如果沒有視訊軌道，則執行螢幕閃爍備用方案
                setScreenFlash(state);
                return;
            }

            try {
                await videoTrack.applyConstraints({
                    advanced: [{ torch: state }]
                });
            } catch (error) {
                console.warn('無法使用手電筒 API，將使用螢幕閃爍。', error);
                // 執行螢幕閃爍備用方案
                setScreenFlash(state);
            }
        }

        /**
         * 螢幕閃爍備用方案
         * @param {boolean} state - true 為亮白屏, false 為灰屏
         */
        function setScreenFlash(state) {
            body.classList.toggle('flash-screen', state);
            if (state) {
                statusDisplay.textContent = '狀態：發送 SOS 中 (螢幕閃爍備用)';
            } else if (!isRunning) {
                statusDisplay.textContent = '狀態：已停止';
            }
        }

        // --- SOS 邏輯和循環 ---

        /**
         * 循環執行 SOS 序列
         * @param {number} index - 當前序列步驟的索引
         */
        function loopSOS(index) {
            if (!isRunning) return;

            const step = MORSE_CODE_SEQUENCE[index % MORSE_CODE_SEQUENCE.length];
            const nextIndex = (index + 1);

            // 執行當前步驟：開啟或關閉手電筒/螢幕
            setTorch(step.on);

            // 設定計時器執行下一個步驟
            timerId = setTimeout(() => {
                loopSOS(nextIndex);
            }, step.duration);
        }

        /**
         * 停止 SOS 訊號
         */
        function stopSOS() {
            isRunning = false;
            clearTimeout(timerId);

            // 關閉手電筒或清除螢幕閃爍
            setTorch(false);

            // 停止並釋放相機資源
            if (videoTrack) {
                videoTrack.stop();
                videoTrack = null;
            }

            // 更新按鈕和狀態
            button.textContent = '啟動 SOS 訊號';
            button.classList.remove('stop');
            statusDisplay.textContent = '狀態：已停止';
        }

        /**
         * 啟動 SOS 訊號 (主要流程)
         */
        async function startSOS() {
            if (isRunning) return;
            isRunning = true;
            statusDisplay.textContent = '狀態：正在請求相機權限...';

            // 步驟 1: 請求相機權限並取得視訊軌道
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment' // 請求後置鏡頭
                    }
                });
                videoTrack = stream.getVideoTracks()[0];
                statusDisplay.textContent = '狀態：權限已取得，正在發送 SOS 中 (手電筒)';

            } catch (error) {
                console.error('無法取得相機權限:', error);
                // 如果權限被拒絕，則無法使用手電筒，但仍可以嘗試螢幕閃爍
                videoTrack = null; // 確保走備用方案
                statusDisplay.textContent = '狀態：無法存取手電筒，將使用螢幕閃爍備用。';
            }

            // 更新按鈕
            button.textContent = '停止 SOS 訊號';
            button.classList.add('stop');

            // 啟動 SOS 循環
            loopSOS(0);
        }

        // --- 事件監聽 ---

        button.addEventListener('click', () => {
            if (isRunning) {
                stopSOS();
            } else {
                startSOS();
            }
        });

        // 確保在頁面卸載時停止手電筒
        window.addEventListener('beforeunload', stopSOS);
        
        // --- 註冊 Service Worker (新增到您原有的 JS 程式碼結尾) ---
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(registration => {
                        console.log('Service Worker 註冊成功:', registration.scope);
                    })
                    .catch(error => {
                        console.log('Service Worker 註冊失敗:', error);
                    });
            });
        }
