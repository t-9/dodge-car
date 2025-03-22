// ===============================
// 定数・変数の定義
// ===============================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const gameOverDiv = document.getElementById("gameOver");
const finalScoreText = document.getElementById("finalScore");
const scoreSpan = document.getElementById("score");

// ▼ BGM 要素を取得
const bgm = document.getElementById("bgm");           // メインBGM(ループ)
const gameOverBgm = document.getElementById("gameOverBgm"); // ゲームオーバーBGM(1回)

const CANVAS_WIDTH = canvas.width;   // 400
const CANVAS_HEIGHT = canvas.height; // 600

// 車のパラメータ
const playerWidth = 40;
const playerHeight = 60;
let playerX = CANVAS_WIDTH / 2 - playerWidth / 2;
let playerY = CANVAS_HEIGHT - playerHeight - 20; // 画面下付近
let playerSpeed = 5;

// スコア
let score = 0;

// 敵リスト
let enemies = [];

// 難易度パラメータ
let enemySpeedMin = 3;
let enemySpeedMax = 6;
let enemySpawnInterval = 60;
let enemySpawnCounter = 0;
let nextDifficultyScore = 1000;

// ゲームループ管理
let animationId = null;
let isGameRunning = false;
let gameFrame = 0;

// 6車線関連
// レーン幅: 400 / 6 ≈ 66.66
const laneWidth = CANVAS_WIDTH / 6;
// レーン境界線の x座標(5本)
let laneLines = [];
for (let i = 1; i < 6; i++) {
  laneLines.push(i * laneWidth);
}
// レーンの中央(x座標)が6箇所
let laneCenters = [];
for (let i = 0; i < 6; i++) {
  laneCenters.push((i + 0.5) * laneWidth);
}

// キー入力制御
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

// ===============================
// ゲーム開始・終了・リスタート
// ===============================
function startGame() {
  if (isGameRunning) return;

  resetGame();
  isGameRunning = true;
  gameOverDiv.style.display = "none";
  startBtn.disabled = true;

  // メインBGMスタート
  bgm.currentTime = 0;
  bgm.play().catch(err => {
    console.warn("BGM再生がブロックされました:", err);
  });

  animate();
}

function endGame() {
  isGameRunning = false;
  cancelAnimationFrame(animationId);

  // スコア表示
  gameOverDiv.style.display = "block";
  finalScoreText.textContent = `Your Score: ${score}`;

  // メインBGM停止
  bgm.pause();
  bgm.currentTime = 0;

  // ゲームオーバーBGM再生
  gameOverBgm.currentTime = 0;
  gameOverBgm.play().catch(err => {
    console.warn("GameOverBGM再生がブロックされました:", err);
  });
}

function restartGame() {
  resetGame();
  gameOverDiv.style.display = "none";
  isGameRunning = true;

  // ゲームオーバーBGMを止める
  gameOverBgm.pause();
  gameOverBgm.currentTime = 0;

  // メインBGM再生
  bgm.currentTime = 0;
  bgm.play().catch(err => {
    console.warn("BGM再生がブロックされました:", err);
  });

  animate();
}

// ===============================
// 初期化
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

  // 背景(6車線)描画
  drawRoad();

  // プレイヤー操作
  handlePlayerMovement();

  // プレイヤー描画
  drawPlayer();

  // 敵生成＆描画
  handleEnemy();

  // 衝突チェック
  checkCollision();

  // スコア更新
  score++;
  scoreSpan.textContent = score;

  // 難易度アップ
  updateDifficulty();

  gameFrame++;
}

// ===============================
// 難易度アップ (スコア1000ごと)
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
// 背景 (6車線) の描画
// ===============================
function drawRoad() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;

  // 白線の破線パターン
  const dashHeight = 20;
  const gapHeight = 20;

  // 背景を下方向に流す演出 => 自車が上へ進んでいるように見える
  const scrollSpeed = 50;
  const offset = (gameFrame * scrollSpeed) % (dashHeight + gapHeight);

  // laneLines (5本) に縦破線を引く
  laneLines.forEach(lineX => {
    let yPos = offset;
    ctx.beginPath();
    while (yPos < CANVAS_HEIGHT) {
      ctx.moveTo(lineX, yPos);
      ctx.lineTo(lineX, yPos + dashHeight);
      yPos += dashHeight + gapHeight;
    }
    ctx.stroke();
  });
}

// ===============================
// プレイヤーの描画
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
// 敵車の生成＆描画 (6車線)
// ===============================
function handleEnemy() {
  // 一定フレームごとに敵生成
  if (enemySpawnCounter % enemySpawnInterval === 0) {
    spawnEnemy();
  }
  enemySpawnCounter++;

  // 敵更新＆描画
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    e.y += e.speed;

    // 画面下に消えたら削除
    if (e.y > CANVAS_HEIGHT) {
      enemies.splice(i, 1);
      i--;
      continue;
    }
    drawEnemy(e);
  }
}

/**
 * 6車線のどこか1レーンをランダムに選んで敵を配置。
 * 他の敵と重ならない位置が見つかるまでリトライ。
 */
function spawnEnemy() {
  const width = 40;
  const height = 60;

  const maxTry = 20;
  let tryCount = 0;

  while (tryCount < maxTry) {
    tryCount++;

    // レーンをランダムに選ぶ
    const laneIndex = Math.floor(Math.random() * 6); // 0〜5
    const centerX = laneCenters[laneIndex];

    // 敵の x座標: レーンの中心 - 車幅/2
    const x = centerX - width / 2;
    const y = -height; // 画面上外
    const speed = Math.random() * (enemySpeedMax - enemySpeedMin) + enemySpeedMin;

    // 他の敵と重ならないかチェック
    if (!isOverlappingAnyEnemy(x, y, width, height)) {
      enemies.push({ x, y, width, height, speed });
      break;
    }
  }
}

// 敵の重なり判定 (AABB)
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
// 衝突判定 (プレイヤー vs 敵)
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

  // 画面外へ出ないように制限
  if (playerX < 0) {
    playerX = 0;
  }
  if (playerX + playerWidth > CANVAS_WIDTH) {
    playerX = CANVAS_WIDTH - playerWidth;
  }
  if (playerY < 0) {
    playerY = 0;
  }
  if (playerY + playerHeight > CANVAS_HEIGHT) {
    playerY = CANVAS_HEIGHT - playerHeight;
  }
}
