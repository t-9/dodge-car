// ===============================
// 定数や変数の定義
// ===============================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const gameOverDiv = document.getElementById("gameOver");
const finalScoreText = document.getElementById("finalScore");
const scoreSpan = document.getElementById("score");

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// プレイヤーの車のパラメータ
const playerWidth = 40;
const playerHeight = 60;
let playerX = CANVAS_WIDTH / 2 - playerWidth / 2;
let playerY = CANVAS_HEIGHT - playerHeight - 20; // 画面下付近に配置
let playerSpeed = 5;  // 左右/上下移動の速さ

// 敵車のリスト
let enemies = [];

// 難易度関連のパラメータ
let enemySpeedMin = 3;           // 敵車の最小速度
let enemySpeedMax = 6;           // 敵車の最大速度
let enemySpawnInterval = 60;     // 何フレームごとに敵を生成するか

// スコア
let score = 0;

// ゲームループ用
let animationId = null;
let isGameRunning = false;
let gameFrame = 0;

// 難易度を上げるためのしきい値
let nextDifficultyScore = 1000;  // 次に難易度を上げるスコア

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

  animate();
}

function endGame() {
  isGameRunning = false;
  cancelAnimationFrame(animationId);

  gameOverDiv.style.display = "block";
  finalScoreText.textContent = `Your Score: ${score}`;
}

function restartGame() {
  resetGame();
  gameOverDiv.style.display = "none";
  animate();
  isGameRunning = true;
}

function resetGame() {
  score = 0;
  scoreSpan.textContent = score;
  playerX = CANVAS_WIDTH / 2 - playerWidth / 2;
  playerY = CANVAS_HEIGHT - playerHeight - 20;
  enemies = [];
  gameFrame = 0;

  // 難易度パラメータをリセット
  enemySpeedMin = 3;
  enemySpeedMax = 6;
  enemySpawnInterval = 60;
  nextDifficultyScore = 1000;
}

// ===============================
// ゲームループ(アニメーション)
// ===============================
function animate() {
  animationId = requestAnimationFrame(animate);
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 背景(道路)の描画
  drawRoad();

  // プレイヤー操作
  handlePlayerMovement();

  // プレイヤーの描画
  drawPlayer();

  // 敵車を生成＆描画
  handleEnemy();

  // 衝突チェック
  checkCollision();

  // スコア更新
  score++;
  scoreSpan.textContent = score;

  // 難易度アップ判定
  updateDifficulty();

  gameFrame++;
}

// ===============================
// 難易度アップの処理
// ===============================
function updateDifficulty() {
  // score が 1000, 2000, 3000... に到達するたびに難易度アップ
  if (score >= nextDifficultyScore) {
    // 敵の速度を少し上げる
    enemySpeedMin += 0.5;
    enemySpeedMax += 0.5;

    // 敵の出現間隔を短くする (下限は 15 フレームまで)
    if (enemySpawnInterval > 15) {
      enemySpawnInterval -= 5;
    }

    // 次の難易度アップスコアを 1000 点先へ
    nextDifficultyScore += 1000;
  }
}

// ===============================
// 背景（道路）の描画
// ===============================
function drawRoad() {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;

  const dashHeight = 20;
  const gapHeight = 20;

  // 白線が下へ流れているように表示 => 自車が上へ進んでいるように見える
  const scrollSpeed = 50;  // ここを指定の 50 に設定
  const offset = (gameFrame * scrollSpeed) % (dashHeight + gapHeight);

  let yPos = offset;
  const centerX = CANVAS_WIDTH / 2;
  ctx.beginPath();
  while (yPos < CANVAS_HEIGHT) {
    ctx.moveTo(centerX, yPos);
    ctx.lineTo(centerX, yPos + dashHeight);
    yPos += dashHeight + gapHeight;
  }
  ctx.stroke();
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
// 敵車の生成＆描画
// ===============================
function handleEnemy() {
  // 一定フレームごとに敵を生成
  if (enemySpawnCounter % enemySpawnInterval === 0) {
    spawnEnemy();
  }
  enemySpawnCounter++;

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    // 上から下へ移動
    e.y += e.speed;

    // 画面下に消えたら配列から削除
    if (e.y > CANVAS_HEIGHT) {
      enemies.splice(i, 1);
      i--;
      continue;
    }
    drawEnemy(e);
  }
}
let enemySpawnCounter = 0;

/**
 * 敵車を1台生成する（既存の敵とは重ならないように配置）
 */
function spawnEnemy() {
  const width = 40;
  const height = 60;
  const maxTry = 20;
  let tryCount = 0;

  while (tryCount < maxTry) {
    tryCount++;
    const x = Math.random() * (CANVAS_WIDTH - width);
    const y = -height; // 画面の上外から
    const speed = Math.random() * (enemySpeedMax - enemySpeedMin) + enemySpeedMin;

    if (!isOverlappingAnyEnemy(x, y, width, height)) {
      enemies.push({ x, y, width, height, speed });
      break;
    }
  }
}

/**
 * 指定した (x, y, w, h) が既存の敵と重なっていないか判定
 */
function isOverlappingAnyEnemy(x, y, w, h) {
  for (const e of enemies) {
    if (
      x < e.x + e.width &&
      x + w > e.x &&
      y < e.y + e.height &&
      y + h > e.y
    ) {
      return true;  // 重なりがある
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
    // AABB衝突判定
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
// プレイヤーの操作
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
