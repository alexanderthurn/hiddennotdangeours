console.log('no need to hide')
var canvas = document.getElementById('canvas')
const ctx = canvas.getContext("2d");
var mousePosition = {x: 0, y: 0};


document.addEventListener("DOMContentLoaded", function(event){
    console.log('hahahahahahaha')
    window.requestAnimationFrame(gameLoop);
    resizeCanvasToDisplaySize(canvas)
    canvas.addEventListener('pointermove', event => {
        mousePosition.x = event.clientX - canvas.offsetLeft;
        mousePosition.y = event.clientY -  canvas.offsetTop;
    }, false);

})

window.addEventListener("resize", function(event){
    resizeCanvasToDisplaySize(canvas)
});

function resizeCanvasToDisplaySize(canvas) {
    // look up the size the canvas is being displayed
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
 
    // If it's resolution does not match change it
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
 
    return false;
 }


function gameLoop() {
    draw();
    window.requestAnimationFrame(gameLoop);
}

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.beginPath();
    ctx.arc(mousePosition.x, mousePosition.y, 40, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "blue";
    ctx.stroke();

}