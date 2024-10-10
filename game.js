console.log('no need to hide')
var canvas = document.getElementById('canvas')
const ctx = canvas.getContext("2d");
var mice = [{x: 0, y: 0, isAnyButtonPressed: false}];
var keyboardPlayers = [{}, {}];
var keyboards = [{bindings: {
    'a': {player: keyboardPlayers[0], action: 'left'},
    'd': {player: keyboardPlayers[0], action: 'right'},
    'w': {player: keyboardPlayers[0], action: 'up'},
    's': {player: keyboardPlayers[0], action: 'down'},
    'ArrowLeft': {player: keyboardPlayers[1], action: 'left'},
    'ArrowRight': {player: keyboardPlayers[1], action: 'right'},
    'ArrowUp': {player: keyboardPlayers[1], action: 'up'},
    'ArrowDown': {player: keyboardPlayers[1], action: 'down'}}, pressed: {}}];
var virtualGamepads = []
var stop = false;
var frameCount = 0;
var startTime, then, now, dt, fps=0, fpsTime
var dtFix = 10, dtToProcess = 0
var figures = []
var image = new Image()
image.src = 'character_base_16x16.png'
var imageAnim = {
    down: {a: [[0,0,16,16], [16,0,16,16], [32,0,16,16], [48,0,16,16]]},
    up: {a: [[0,16,16,16], [16,16,16,16], [32,16,16,16], [48,16,16,16]]},
    left: {a: [[0,48,16,16], [16,48,16,16], [32,48,16,16], [48,48,16,16]]},
    right: {a: [[0,32,16,16], [16,32,16,16], [32,32,16,16], [48,32,16,16]]}
}

document.addEventListener("DOMContentLoaded", function(event){
    resizeCanvasToDisplaySize(canvas)

    console.log('hahahahahahaha')
   
    then = Date.now();
    startTime = then;
    fpsTime = then
    figures = []
    for (var i = 0; i < 20; i++) {
        figures.push({
            x: Math.random()*canvas.width,
            y: Math.random()*canvas.height,
            xTarget: Math.random()*canvas.width,
            yTarget: Math.random()*canvas.height,
            maxSpeed: 0.08,
            speed: 0,
            isAlive: true, 
            isAI: i > 5,
            index: i,
            angle: 0,
            anim: 0
        })
    }

    window.requestAnimationFrame(gameLoop);
})

window.addEventListener('keydown', event => {
    keyboards.forEach(k => {
        k.pressed[event.key] = true;
    });
});

window.addEventListener('keyup', event => {
    keyboards.forEach(k => {
        delete k.pressed[event.key];
    });
});

canvas.addEventListener('pointermove', event => {
    mice[0].x = event.clientX - canvas.offsetLeft;
    mice[0].y = event.clientY -  canvas.offsetTop;
   // mice[0].isAnyButtonPressed = event.buttons.some(b => b.pressed)
}, false);

window.addEventListener("resize", function(event){
    resizeCanvasToDisplaySize(canvas)
});


function gameLoop() {
    now = Date.now();
    dt = now - then;
    if (fpsTime < now - 1000) {
        fpsTime = now
        fps = Math.floor(1000/dt)
    }
    virtualGamepads = navigator.getGamepads().filter(x => x && x.connected).map(g => {
        g.isAnyButtonPressed = g.buttons.some(b => b.pressed)
        let x = g.axes[0];
        let y = g.axes[1];
        [x, y] = setDeadzone(x, y,0.0001);
        [x, y] = clampStick(x, y);
        g.xAxis = x
        g.yAxis = y
        g.isMoving = Math.abs(x) > 0 && Math.abs(y) > 0.0001
        return g
    });

    keyboardPlayers.forEach(kp => {
        kp.xAxis = 0;
        kp.yAxis = 0;
        kp.isMoving = false;
    });

    keyboards.forEach(k => {
        Object.keys(k.pressed).forEach(pressedButton => {
            const binding = k.bindings[pressedButton];
            if (binding) {
                const action = binding.action;
                let p = binding.player;
                switch (action) {
                    case 'left':
                        p.xAxis--;
                        break;
                    case 'right':
                        p.xAxis++;
                        break;
                    case 'up':
                        p.yAxis--;
                        break;
                    case 'down':
                        p.yAxis++;
                        break;
                    default:
                        break;
                }
                p.isMoving = p.xAxis !== 0 || p.yAxis !== 0;
            }
        })
    });

    let players = [...virtualGamepads, ...keyboardPlayers];

   /* mice.forEach(m => {
        g = {}
        let x = m.x - canvas.x / 2;
        let y = m.y - canvas.y / 2;
        [x, y] = setDeadzone(x, y,0.0001);
        [x, y] = clampStick(x, y);
        g.xAxis = x
        g.yAxis = y
        g.isMoving = Math.abs(x) > 0 && Math.abs(y) > 0.0001
        virtualGamepads.unshift(g)
    })*/
   

    dtToProcess += dt
    while(dtToProcess > dtFix) {
        handleInput(players, figures)
        handleAi(figures)
        updateGame(figures, dtFix)
        dtToProcess-=dtFix
    }
    
    draw(virtualGamepads, mice, figures, dt);


    then = now
    window.requestAnimationFrame(gameLoop);
}

function updateGame(figures, dt) {
    figures.forEach(f => {
        let xyNew = move(f.x, f.y, f.angle,f.speed, dt)
        f.x = xyNew.x
        f.y = xyNew.y
        f.anim += f.speed
    })
}

function handleInput(players, figures) {
    players.forEach((p,i) => {
        var f = figures[i]
        f.speed = 0.0
        if (p.isMoving) {
            f.angle = angle(0,0,p.xAxis,p.yAxis)
            f.speed = f.maxSpeed
        }
    });
}

function handleAi(figures) {
    figures.filter(f => f.isAI).forEach(f => {
        if (distance(f.x,f.y,f.xTarget,f.yTarget) < 5) {
            f.xTarget = Math.random()*canvas.width
            f.yTarget = Math.random()*canvas.height
        }
        f.angle = angle(f.x,f.y,f.xTarget,f.yTarget)
        f.speed = f.maxSpeed
    })
}

function draw(gamepads, mice, figures, dt) {

    /*HALLO*/
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.beginPath();
    ctx.arc(mice[0].x, mice[0].y, 40, 0, 2 * Math.PI);
    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "red";
    ctx.stroke();

    figures.forEach(f => {
        let deg = rad2deg(f.angle)
        if (f.speed > 0 && !f.isAI) {
            console.log(deg)
        }
        if (deg <= 45 || deg > 315) {
            frame = imageAnim.left.a
        } else if (deg > 45 && deg <= 135){
            frame = imageAnim.up.a
        } else if (deg > 135 && deg <= 225){
            frame = imageAnim.right.a
        } else {
            frame = imageAnim.down.a
        }

        let sprite = frame[Math.floor(f.anim) % frame.length]
        ctx.drawImage(image, sprite[0], sprite[1], sprite[2], sprite[3], f.x - 32, f.y - 32, 64, 64)


        ctx.beginPath()
        ctx.lineWidth = 1;
        ctx.fillStyle = "green";
        if (!f.isAI) {
            ctx.fillStyle = "red";
        }
        ctx.arc(f.x, f.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        if (!f.isAI) {
            ctx.fillStyle = "red";
            ctx.font = "16px serif";
            ctx.fillStyle = "white";
            ctx.fillText(f.index + '',f.x,f.y)
        }
    })

  


    ctx.font = "16px serif";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline='top'
    ctx.fillText("FPS: " + fps + " Gamepads: " + gamepads.length + " Mouses: " + mice.length + " Time: " + (new Date().getTime() / 1000), 0, 0);
    gamepads.forEach((g,i) => {
        ctx.fillText("xAxis: " + g.xAxis + " yAxis: " + g.yAxis + " Button?: " + g.isAnyButtonPressed,0,(1+i)*16) 
    })
}