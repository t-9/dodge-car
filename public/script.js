// ===============================
// 定数・変数の定義
// ===============================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const copyClipboardBtn = document.getElementById("copyClipboardBtn");
const shareXBtn = document.getElementById("shareXBtn");
const gameOverDiv = document.getElementById("gameOver");
const finalScoreText = document.getElementById("finalScore");
const scoreSpan = document.getElementById("score");

// BGM
const bgm = document.getElementById("bgm");
const gameOverBgm = document.getElementById("gameOverBgm");

const CANVAS_WIDTH = canvas.width;   // 400
const CANVAS_HEIGHT = canvas.height; // 600

// プレイヤー車
const playerWidth = 40;
const playerHeight = 60;
let playerX = CANVAS_WIDTH / 2 - playerWidth / 2;
let playerY = CANVAS_HEIGHT - playerHeight - 20;
let playerSpeed = 5;

// スコア
let score = 0;

// 敵
let enemies = [];

// 難易度関連
let enemySpeedMin = 3;
let enemySpeedMax = 6;
let enemySpawnInterval = 60;
let enemySpawnCounter = 0;
let nextDifficultyScore = 1000;

// ゲームループ
let animationId = null;
let isGameRunning = false;
let gameFrame = 0;

// 6車線 => 400/6=約66.66
const laneCount = 6;
const laneWidth = CANVAS_WIDTH / laneCount;

// レーン境界線 (5本)
const laneLines = [];
for (let i = 1; i < laneCount; i++) {
  laneLines.push(i * laneWidth);
}

// レーンの中央座標 (6つ)
const laneCenters = [];
for (let i = 0; i < laneCount; i++) {
  laneCenters.push((i + 0.5) * laneWidth);
}

// キーボード入力
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
};

// ===============================
// イベントリスナー
// ===============================
document.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
  }
});
document.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;
  }
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", restartGame);

// 「Copy to Clipboard」ボタン
copyClipboardBtn.addEventListener("click", () => {
  copyCanvasToClipboard(canvas);
});

// 「Share on X」ボタン
shareXBtn.addEventListener("click", () => {
  const text = `スコア: ${score} だったよ！\n\n▼プレイはこちらから\nhttps://t-9.github.io/dodge-car/\n\n#CarAvoidanceGame`;
  const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
});

// ===============================
// ゲーム制御
// ===============================
function startGame() {
  if (isGameRunning) return;

  resetGame();
  isGameRunning = true;
  gameOverDiv.style.display = "none";
  startBtn.disabled = true;

  // BGM再生
  bgm.currentTime = 0;
  bgm.play().catch(err => {
    console.warn("BGM再生ブロック:", err);
  });

  animate();
}

function endGame() {
  isGameRunning = false;
  cancelAnimationFrame(animationId);

  gameOverDiv.style.display = "block";
  finalScoreText.textContent = `Your Score: ${score}`;

  // メインBGM停止
  bgm.pause();
  bgm.currentTime = 0;

  // ゲームオーバーBGM
  gameOverBgm.currentTime = 0;
  gameOverBgm.play().catch(err => {
    console.warn("GameOverBGMエラー:", err);
  });
}

function restartGame() {
  resetGame();
  gameOverDiv.style.display = "none";
  isGameRunning = true;

  // ゲームオーバーBGM停止
  gameOverBgm.pause();
  gameOverBgm.currentTime = 0;

  // メインBGM再生
  bgm.currentTime = 0;
  bgm.play().catch(err => {
    console.warn("BGM再生ブロック:", err);
  });

  animate();
}

// ===============================
// ゲームリセット
// ===============================
function resetGame() {
  score = 0;
  scoreSpan.textContent = score;

  playerX = CANVAS_WIDTH / 2 - playerWidth / 2;
  playerY = CANVAS_HEIGHT - playerHeight - 20;

  enemies = [];
  enemySpawnCounter = 0;
  gameFrame = 0;

  // 難易度初期化
  enemySpeedMin = 3;
  enemySpeedMax = 6;
  enemySpawnInterval = 60;
  nextDifficultyScore = 1000;
}

// ===============================
// ゲームループ
// ===============================
function animate() {
  animationId = requestAnimationFrame(animate);
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawRoad();
  handlePlayerMovement();
  drawPlayer();
  handleEnemy();

  // ====【修正ポイント】====
  // 先にスコアを加算してDOM更新
  score++;
  scoreSpan.textContent = score;

  // その後、衝突チェック
  checkCollision();

  // 難易度アップ
  updateDifficulty();

  gameFrame++;
}

// ===============================
// 難易度アップ
// ===============================
function updateDifficulty() {
  if (score >= nextDifficultyScore) {
    enemySpeedMin += 0.5;
    enemySpeedMax += 0.5;
    if (enemySpawnInterval > 15) {
      enemySpawnInterval -= 5;
    }
    nextDifficultyScore += 1000;
  }
}

// ===============================
// 背景（6車線）の描画
// ===============================
function drawRoad() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;

  const dashHeight = 20;
  const gapHeight = 20;
  const scrollSpeed = 50;
  const offset = (gameFrame * scrollSpeed) % (dashHeight + gapHeight);

  for (let lineX of laneLines) {
    let yPos = offset;
    ctx.beginPath();
    while (yPos < CANVAS_HEIGHT) {
      ctx.moveTo(lineX, yPos);
      ctx.lineTo(lineX, yPos + dashHeight);
      yPos += dashHeight + gapHeight;
    }
    ctx.stroke();
  }
}

// ===============================
// プレイヤー描画
// ===============================
function drawPlayer() {
  ctx.fillStyle = "#00ff00";
  ctx.fillRect(playerX, playerY, playerWidth, playerHeight);

  // 前ライト（上）
  ctx.fillStyle = "#ffff00";
  ctx.fillRect(playerX + playerWidth * 0.2, playerY - 5, playerWidth * 0.2, 5);
  ctx.fillRect(playerX + playerWidth * 0.6, playerY - 5, playerWidth * 0.2, 5);

  // 後ライト（下）
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(playerX + playerWidth * 0.2, playerY + playerHeight, playerWidth * 0.2, 5);
  ctx.fillRect(playerX + playerWidth * 0.6, playerY + playerHeight, playerWidth * 0.2, 5);
}

// ===============================
// 敵生成＆描画
// ===============================
function handleEnemy() {
  if (enemySpawnCounter % enemySpawnInterval === 0) {
    spawnEnemy();
  }
  enemySpawnCounter++;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    e.y += e.speed;
    if (e.y > CANVAS_HEIGHT) {
      enemies.splice(i, 1);
      i--;
      continue;
    }
    drawEnemy(e);
  }
}

function spawnEnemy() {
  const width = 40;
  const height = 60;
  const maxTry = 20;
  let tryCount = 0;

  while (tryCount < maxTry) {
    tryCount++;
    const laneIndex = Math.floor(Math.random() * laneCount);
    const centerX = laneCenters[laneIndex];
    const x = centerX - width / 2;
    const y = -height;
    const speed = Math.random() * (enemySpeedMax - enemySpeedMin) + enemySpeedMin;

    if (!isOverlappingAnyEnemy(x, y, width, height)) {
      enemies.push({ x, y, width, height, speed });
      break;
    }
  }
}

function isOverlappingAnyEnemy(x, y, w, h) {
  for (const e of enemies) {
    if (
      x < e.x + e.width &&
      x + w > e.x &&
      y < e.y + e.height &&
      y + h > e.y
    ) {
      return true;
    }
  }
  return false;
}

function drawEnemy(enemy) {
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

  // 前方ライト(下)
  ctx.fillStyle = "#ffff00";
  ctx.fillRect(
    enemy.x + enemy.width * 0.2,
    enemy.y + enemy.height - 4,
    enemy.width * 0.2,
    4
  );
  ctx.fillRect(
    enemy.x + enemy.width * 0.6,
    enemy.y + enemy.height - 4,
    enemy.width * 0.2,
    4
  );

  // 後方ライト(上)
  ctx.fillStyle = "#ffaaaa";
  ctx.fillRect(enemy.x + enemy.width * 0.2, enemy.y, enemy.width * 0.2, 4);
  ctx.fillRect(enemy.x + enemy.width * 0.6, enemy.y, enemy.width * 0.2, 4);
}

// ===============================
// 衝突判定
// ===============================
function checkCollision() {
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (
      playerX < e.x + e.width &&
      playerX + playerWidth > e.x &&
      playerY < e.y + e.height &&
      playerY + playerHeight > e.y
    ) {
      endGame();
      break;
    }
  }
}

// ===============================
// プレイヤー操作
// ===============================
function handlePlayerMovement() {
  if (keys.ArrowLeft) {
    playerX -= playerSpeed;
  }
  if (keys.ArrowRight) {
    playerX += playerSpeed;
  }
  if (keys.ArrowUp) {
    playerY -= playerSpeed;
  }
  if (keys.ArrowDown) {
    playerY += playerSpeed;
  }

  // 画面外制限
  if (playerX < 0) playerX = 0;
  if (playerX + playerWidth > CANVAS_WIDTH) playerX = CANVAS_WIDTH - playerWidth;
  if (playerY < 0) playerY = 0;
  if (playerY + playerHeight > CANVAS_HEIGHT) {
    playerY = CANVAS_HEIGHT - playerHeight;
  }
}

// ===============================
// Canvasをクリップボードにコピー
// ===============================
function copyCanvasToClipboard(canvas) {
  canvas.toBlob(async (blob) => {
    if (!blob) {
      alert("画像を取得できませんでした");
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      alert("Screenshot copied to clipboard!\nXの投稿画面でCtrl+V(Cmd+V)してください。");
    } catch (e) {
      alert("コピーに失敗しました。\nブラウザが対応していない可能性があります。");
      console.error("Clipboard error:", e);
    }
  }, "image/png");
}
