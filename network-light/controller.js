

const angle = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1); 
const getQueryParam = (key) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key); // Gibt den Wert des Parameters oder null zurück
}

var touchControl = null


class FWApplication extends PIXI.Application {
    constructor(options) {
        super(options)

        this.containerGame = new PIXI.Container()
        this.containerLoading = new PIXI.Container()
    }

    async init(options) {
        await super.init(options)   
        document.body.appendChild(this.canvas);
        this.stage.addChild(this.containerGame, this.containerLoading)

        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Xolonium',
            fontStyle: 'Bold',
            fontSize: 64,
            fill: '#fff',
            wordWrap: false,
            wordWrapWidth: 440,
        });
    

        this.containerLoading.bar = new PIXI.Graphics() 
        this.containerLoading.title = new PIXI.Text({text: 'FW Remote', style: textStyle})
        this.containerLoading.text = new PIXI.Text({text: '', style: textStyle})
        this.containerLoading.title.anchor.set(0.5,0.0)
        this.containerLoading.text.anchor.set(0.5,-2.0)
        this.containerLoading.addChild(this.containerLoading.bar, this.containerLoading.title, this.containerLoading.text)
        this.containerGame.visible = false
        this.containerLoading.visible = true
        this.ticker.add(this.onUpdateLoader, this)
    }

    onUpdateLoader(ticker) {
        let scaleToFullHD = this.screen.width/1920
        this.containerLoading.bar.position.set(this.screen.width*0.5, this.screen.height*0.8)
        this.containerLoading.text.position.set(this.screen.width*0.5, this.screen.height*0.6)
        this.containerLoading.title.position.set(this.screen.width*0.5, this.screen.height*0.1)
        this.containerLoading.title.scale.set(4*scaleToFullHD*0.5)
        
        this.containerLoading.text.position.set(this.screen.width*0.5, this.screen.height*0.15)
        this.containerLoading.text.scale.set(4*Math.min(0.5,scaleToFullHD)*0.25)
        this.containerLoading.bar.scale = 0.99+0.01*Math.sin(ticker.lastTime*0.01)
        this.containerLoading.bar.clear()
        this.containerLoading.bar.rect(-this.screen.width*0.25, -this.screen.height*0.05, this.screen.width*0.5, this.screen.height*0.1).stroke({color: 0xffffff, width: this.screen.height*0.01, alpha:1.0}).rect(-this.screen.width*0.25, -this.screen.height*0.05, this.screen.width*0.5*this.containerLoading.percentage, this.screen.height*0.1).fill();
    }


    setLoading(percentage, text = '') {
        this.containerLoading.percentage = percentage
        if (text !== undefined)
            this.containerLoading.text.text = text
        this.render()
    }

    finishLoading() {
        this.ticker.remove(this.onUpdateLoader, this)
        this.containerGame.visible = true
        this.containerLoading.visible = false
    }

}



// Funktion, um den Graphen mit Pixi.js zu zeichnen
async function init() {

    const app = new FWApplication();
    await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0xf4b400,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        resizeTo: window
    });

    app.setLoading(0.0, 'Loading')
    touchControl = new FWTouchControl(app)
    app.containerGame.addChild(touchControl)

    app.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    app.canvas.addEventListener('touchstart', (e) => {
       e.preventDefault();
    });



    app.serverId = getQueryParam('id') || '1234'
    app.finishLoading()
   

    app.ticker.add((ticker) => {

        app.isPortrait = app.screen.width < app.screen.height;
        app.ticker = ticker

       // app.containerGame.y = app.screen.height*0.25;
        //app.containerGame.pivot.set(app.screen.width*0.5, app.screen.height*0.5);


        if (app.isPortrait) {
            app.containerGame.angle = -270 - ticker.lastTime*0.0;
            app.containerGame.x = app.screen.width
            //app.containerGame.scale.set( app.screen.width / app.screen.height, app.screen.width / app.screen.height);
            app.containerGame.screenWidth = app.screen.height;
            app.containerGame.screenHeight = app.screen.width;    
        } else {
            app.containerGame.angle = 0;
            app.containerGame.x = 0
            app.containerGame.scale.set(1, 1);
            app.containerGame.screenWidth = app.screen.width;
            app.containerGame.screenHeight = app.screen.height;
        }

        main(app)
    })


}

window.addEventListener("load", (event) => {
    init();
})


function main(app) {
    touchControl.update(app)
}

class NetworkGamepad {
    constructor() {
        this.axes = [0, 0, 0, 0];
        this.buttons = new Array(17).fill({pressed: false, touched: false, value: 0.0});
        this.connected = true
        this.id = 'network'
        this.index = 0
        this.mapping = 'standard'
    }

    setAxis(index, value) {
        if (index >= 0 && index < this.axes.length) {
            this.axes[index] = Math.max(-1, Math.min(1, value));
        }
    }

    setButton(index, pressed) {
        if (index >= 0 && index < this.buttons.length) {
            if (pressed) {
                this.buttons[index].pressed = true
                this.buttons[index].touched = true
                this.buttons[index].value = 1.0
            } else {
                this.buttons[index].pressed = false
                this.buttons[index].touched = false
                this.buttons[index].value = 0.0
            }
        }
    }

    setFromRealGamepad(gamepad) {
        if (gamepad) {
            gamepad.axes.forEach((a,index) => index < 4 && this.setAxis(index, a));
            gamepad.buttons.forEach((b,index) => index < 17 && this.setButton(index, b.pressed));
            this.connected = gamepad.connected
            this.id = gamepad.id
            this.index = gamepad.index
            this.mapping = gamepad.mapping
        } else {
            this.connected = false
        }
    }

    getState() {
        return {
            axes: [...this.axes],
            buttons: [...this.buttons]
        };
    }

    toJSON() {
        return JSON.stringify(this.getState());
    }
}

class FWTouchControl extends PIXI.Container{
    constructor(app, options) {
        super(options)
        let self = this
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Xolonium',
            fontStyle: 'Bold',
            fontSize: 64,
            fill: '#000'
        });

        const textStyleSmall = new PIXI.TextStyle({
            fontFamily: 'Xolonium',
            fontStyle: 'Bold',
            fontSize: 48,
            fill: '#000'
        });
        
        this.pointer = {pointerType: 'unknown', x: 0, y: 0, xCenter: undefined, yCenter: undefined, pressed: new Set(), events: {}}
        this.buttonContainers = []
        this.axesContainers = []
        this.dpadCenterContainer = new PIXI.Container()

        const radius = 128
        for (let i = 0; i < 2; i++) {
            let axisContainer = new PIXI.Container()
            let axisBackground = new PIXI.Graphics().circle(0, 0, radius).fill({alpha: 0.5, color: 0xFFFFFF})
            let axisStick = new PIXI.Graphics().circle(0, 0, radius/2).fill({alpha: 1.0, color: 0xFFFFFF})
            let axisStickShadow = new PIXI.Graphics().circle(0, 0, radius/2).fill({alpha: 1.0, color: 0xFFFFFF})
            axisStickShadow.alpha = 0.1
            axisStick.startRadius = axisStick.radius = radius/2
            axisStickShadow.startRadius = axisStickShadow.radius = radius/2
            axisContainer.addChild(axisBackground, axisStick, axisStickShadow)
            axisContainer.startRadius = radius
            axisContainer.index = i
            axisContainer.xAxis = axisContainer.xAxisShadow = 0
            axisContainer.yAxis = axisContainer.yAxisShadow = 0
            axisContainer.stick = axisStick
            axisContainer.stickShadow = axisStickShadow
            switch(i) {
                case 0: axisContainer.rPos = [0.0, 1.0, 0.22]; break;
                case 1: axisContainer.rPos = [0.5, 1.0, 0.11, 0.0]; break;
            }

            axisContainer.interactive = true
            axisContainer.addEventListener('pointerdown', {
                handleEvent: function(event) {
                    if (axisContainer.lastTimeClicked && ( Date.now() - axisContainer.lastTimeClicked < 500)) {
                        self.buttonContainers[10+i].pressed= true
                    }
                    axisContainer.lastTimeClicked = Date.now()
                }
            })

            axisContainer.addEventListener('pointermove', {
                handleEvent: function(event) {

                    if (app.isPortrait) {
                        //let gPos = axisContainer.getGlobalPosition()
                        let localEvent = {x: event.y, y: app.containerGame.screenHeight - event.x}
                        console.log(localEvent, axisContainer.x, axisContainer.y)
                        axisContainer.xAxis = (localEvent.x  - axisContainer.x) / axisContainer.radius
                        axisContainer.yAxis = (localEvent.y  - axisContainer.y) / axisContainer.radius
                    } else {
                        axisContainer.xAxis = (event.x  - axisContainer.x) / axisContainer.radius
                        axisContainer.yAxis = (event.y  - axisContainer.y) / axisContainer.radius
                    }

                    axisContainer.xAxisShadow = axisContainer.xAxis
                    axisContainer.yAxisShadow = axisContainer.yAxis
                    
                    if (axisContainer.xAxis*axisContainer.xAxis + axisContainer.yAxis*axisContainer.yAxis > 1.0) {
                        axisContainer.xAxis = Math.cos(angle(0,0,axisContainer.xAxis, axisContainer.yAxis))
                        axisContainer.yAxis = Math.sin(angle(0,0,axisContainer.xAxis, axisContainer.yAxis))
                    }
                
                }
            }) 

            axisContainer.addEventListener('pointerup', {
                handleEvent: function(event) {
                    axisContainer.xAxis = 0
                    axisContainer.yAxis = 0
                    axisContainer.xAxisShadow = 0
                    axisContainer.yAxisShadow = 0
                    self.buttonContainers[10+i].pressed= false
                }
            }) 

            this.axesContainers.push(axisContainer)
            this.addChild(axisContainer)
        }
        
        for (let i = 0; i < 18; i++) {
            let buttonContainer = new PIXI.Container()
            buttonContainer.buttonBackground = new PIXI.Graphics();
            
            if ((i === 12 || i === 13 || i === 14 || i === 15)) {
                buttonContainer.buttonBackground.rect(-radius, -radius, radius*2, radius*2)
                let rot = 0
                if (i === 12) rot = 0
                else if (i === 13) rot = 180
                else if (i === 14) rot = 90
                else if (i === 15) rot = 270
                
                buttonContainer.buttonBackground.regularPoly(Math.sin(PIXI.DEG_TO_RAD * rot)*radius*1.5,-Math.cos(PIXI.DEG_TO_RAD * rot)*radius*1.5, radius, 3,  PIXI.DEG_TO_RAD * rot).fill({alpha: 1.0, color: 0xFFFFFF})

            } else {
                buttonContainer.buttonBackground.circle(0, 0, radius).fill({alpha: 1.0, color: 0xFFFFFF})
            }
            buttonContainer.buttonText = new PIXI.Text({text: i, style: (i === 8 || i === 9 || i === 16 || i === 17) ? textStyleSmall : textStyle})
            buttonContainer.buttonText.anchor.set(0.5)
            buttonContainer.addChild(buttonContainer.buttonBackground, buttonContainer.buttonText)
            buttonContainer.startRadius = radius
            buttonContainer.index = i
            buttonContainer.rPos = [0,0]
            buttonContainer.pressed = false
            buttonContainer.interactive = true

            buttonContainer.addEventListener('pointerdown', {
                handleEvent: function(event) {
                    buttonContainer.pressed = true
                }
            }) 

            buttonContainer.addEventListener('pointerup', {
                handleEvent: function(event) {
                    buttonContainer.pressed = false
                }
            }) 

            buttonContainer.addEventListener('pointerleave', {
                handleEvent: function(event) {
                    buttonContainer.pressed = false
                }
            }) 

            if ((i === 12 || i === 13 || i === 14 || i === 15)) {
                buttonContainer.addEventListener('pointerenter', {
                    handleEvent: function(event) {
                        buttonContainer.pressed = true
                    }
                }) 
            }
            this.buttonContainers.push(buttonContainer)
            this.addChild(buttonContainer)

            switch(i) {
                case 0: buttonContainer.buttonText.text = 'A'; buttonContainer.key = 's'; buttonContainer.rPos = [1.0, 1.0, 0.09, -0.75, 0.0]; break;
                case 1: buttonContainer.buttonText.text = 'B'; buttonContainer.key = 'd'; buttonContainer.rPos = [1.0, 0.8, 0.09, 0.0, 0.0]; break;
                case 2: buttonContainer.buttonText.text = 'X'; buttonContainer.key = 'a'; buttonContainer.rPos = [1.0, 0.8, 0.09, -1.5, 0.0]; break;
                case 3: buttonContainer.buttonText.text = 'Y'; buttonContainer.key = 'w'; buttonContainer.rPos = [1.0, 0.6,0.09, -0.75, 0.0]; break;
                case 4: buttonContainer.buttonText.text = 'LB'; buttonContainer.key = '1'; buttonContainer.rPos = [0.8, 0.0,0.05]; break;
                case 5: buttonContainer.buttonText.text = 'RB'; buttonContainer.key = '4'; buttonContainer.rPos = [1.0, 0.0,0.05]; break;
                case 6: buttonContainer.buttonText.text = 'LT'; buttonContainer.key = 'q'; buttonContainer.rPos = [0.85, 0.1,0.05]; break;
                case 7: buttonContainer.buttonText.text = 'RT'; buttonContainer.key = 'e'; buttonContainer.rPos = [0.95, 0.1,0.05]; break;
                case 8: buttonContainer.buttonText.text = 'SELECT'; buttonContainer.key = 'j'; buttonContainer.rPos = [0.4, 0.3,0.075]; break;
                case 9: buttonContainer.buttonText.text = 'START'; buttonContainer.key = 'l'; buttonContainer.rPos = [0.6, 0.3,0.075]; break;
                case 10: buttonContainer.buttonText.text = 'A1'; buttonContainer.key = 'u'; buttonContainer.rPos = [-2.5, 1.0,0.05, -0.5]; break;
                case 11: buttonContainer.buttonText.text = 'A2'; buttonContainer.key = 'o'; buttonContainer.rPos = [-2.5, 1.0,0.05, 0.5]; break;
                case 12: buttonContainer.buttonText.text = 'v'; buttonContainer.key = 'ArrowDown'; buttonContainer.rPos = [0.035, 0.2,0.05,1.0, 1.0]; break;
                case 13: buttonContainer.buttonText.text = '^'; buttonContainer.key = 'ArrowUp'; buttonContainer.rPos = [0.035, 0.2,0.05, 1.0, -1.0]; break;
                case 14: buttonContainer.buttonText.text = '<'; buttonContainer.key = 'ArrowLeft'; buttonContainer.rPos = [0.035, 0.2,0.05, 0.0, 0]; break;
                case 15: buttonContainer.buttonText.text = '>'; buttonContainer.key = 'ArrowRight'; buttonContainer.rPos = [0.035, 0.2,0.05, 2.0, 0]; break;
                case 16: buttonContainer.buttonText.text = 'HOME'; buttonContainer.key = 'i'; buttonContainer.rPos = [0.5, 0.1,0.075]; break;
                case 17: buttonContainer.buttonText.text = ''; buttonContainer.key = 'k'; buttonContainer.rPos = [0.5, 0.5,0.075]; break;
            }
        }
        this.dpadCenterContainer.rPos = [0.035, 0.2,0.05, 1.0, 0];
        this.dpadCenterContainer.startRadius = radius
        this.dpadCenterContainer.stick = new PIXI.Graphics().rect(-radius, -radius, radius*2, radius*2).fill({alpha: 1.0, color: 0xFFFFFF})
        this.dpadCenterContainer.addChild(this.dpadCenterContainer.stick)
        this.addChild(this.dpadCenterContainer)

        window.addEventListener('keydown', {
            handleEvent: function(event) {
                console.log(event)

                self.buttonContainers.forEach(buttonContainer => {
                    if (event.key === buttonContainer.key) {
                        buttonContainer.pressed = true
                    }
                })
               
            }
        })

        window.addEventListener('keyup', {
            handleEvent: function(event) {
                console.log(event)

                self.buttonContainers.forEach(buttonContainer => {
                    if (event.key === buttonContainer.key) {
                        buttonContainer.pressed = false
                    }
                })
               
            }
        })
        
           
        
    }


    update(app) {

        let minHeightWidth = Math.min(app.containerGame.screenWidth, app.containerGame.screenHeight)
        let maxHeightWidth = Math.max(app.containerGame.screenWidth, app.containerGame.screenHeight)
        //minHeightWidth = maxHeightWidth
        const distanceToBorder = 0.05*minHeightWidth

        this.axesContainers.forEach((container, index) => {
            container.radius = container.rPos[2]*minHeightWidth
            container.scale = container.radius/container.startRadius
            container.x = (distanceToBorder + container.radius) + container.rPos[0]*(app.containerGame.screenWidth - distanceToBorder*2 -container.radius*2) + (container.rPos.length > 3 ? container.rPos[3]*container.radius*2 : 0)
            container.y = (distanceToBorder + container.radius) + container.rPos[1]*(app.containerGame.screenHeight - distanceToBorder*2 -container.radius*2) + (container.rPos.length > 4 ? container.rPos[4]*container.radius*2 : 0)
            container.stickShadow.position.set(container.xAxisShadow * (container.startRadius), container.yAxisShadow * (container.startRadius))
            container.stick.position.set(container.xAxis * (container.startRadius), container.yAxis * (container.startRadius))
            container.stick.tint = (this.buttonContainers[10+index].pressed ? 0x000000 : 0xffffff) 
            container.stick.alpha = (this.buttonContainers[10+index].pressed ? 0.5 : 1.0)
        })

        this.buttonContainers.forEach((container, index) => {
            container.radius = container.rPos[2]*minHeightWidth
            container.scale = container.radius/container.startRadius
            container.alpha = (container.pressed ? 0.5 : 1.0)
            container.tint = (container.pressed ? 0x000000 : 0xffffff) 
            container.x = (distanceToBorder + container.radius) + container.rPos[0]*(app.containerGame.screenWidth - distanceToBorder*2 -container.radius*2) + (container.rPos.length > 3 ? container.rPos[3]*container.radius*2 : 0)
            container.y = (distanceToBorder + container.radius) + container.rPos[1]*(app.containerGame.screenHeight - distanceToBorder*2 -container.radius*2) + (container.rPos.length > 4 ? container.rPos[4]*container.radius*2 : 0)
        })

        this.buttonContainers[17].buttonText.text = app.serverId

        this.dpadCenterContainer.radius = this.dpadCenterContainer.rPos[2]*minHeightWidth
        this.dpadCenterContainer.scale = this.dpadCenterContainer.radius/this.dpadCenterContainer.startRadius
        this.dpadCenterContainer.x = (distanceToBorder + this.dpadCenterContainer.radius) + this.dpadCenterContainer.rPos[0]*(app.containerGame.screenWidth - distanceToBorder*2 -this.dpadCenterContainer.radius*2) + (this.dpadCenterContainer.rPos.length > 3 ? this.dpadCenterContainer.rPos[3]*this.dpadCenterContainer.radius*2 : 0)
        this.dpadCenterContainer.y = (distanceToBorder + this.dpadCenterContainer.radius) + this.dpadCenterContainer.rPos[1]*(app.containerGame.screenHeight - distanceToBorder*2 -this.dpadCenterContainer.radius*2) + (this.dpadCenterContainer.rPos.length > 4 ? this.dpadCenterContainer.rPos[4]*this.dpadCenterContainer.radius*2 : 0)
    

        //if (!mp.pressed.has(0)) {

       // }
       /*
        const xy = move(0, 0, angle(0, 0, this.pointer.xAxis, this.pointer.yAxis), radius/2, 1)
        this.moveControlStick.x = xy.x || 0
        this.moveControlStick.y = xy.y || 0
        console.log(xy)
        this.attackControl.alpha = this.pointer.isAttackButtonPressed ? 1 : 0.75*/
    }

}



   /*
   axes: [0, 0, 0, 0]
   buttons: []
            Gamepads0: A
            Gamepads1: B
            Gamepads2: X
            Gamepads3: Y
            Gamepads4: LB (Left Bumper)
            Gamepads5: RB (Right Bumper)
            Gamepads6: LT (Left Trigger)
            Gamepads7: RT (Right Trigger)
            Gamepads8: Back
            Gamepads9: Start
            Gamepads10: Left Stick (Click)
            Gamepads11: Right Stick (Click)
            Gamepads12: D-Pad Up
            Gamepads13: D-Pad Down
            Gamepads14: D-Pad Left
            Gamepads15: D-Pad Right
            Gamepads16: Guide (Home Button, optional)
        */

            /* 


Type	Index	Location
Button	
0	Bottom button in right cluster
1	Right button in right cluster
2	Left button in right cluster
3	Top button in right cluster
4	Top left front button
5	Top right front button
6	Bottom left front button
7	Bottom right front button
8	Left button in center cluster
9	Right button in center cluster
10	Left stick pressed button
11	Right stick pressed button
12	Top button in left cluster
13	Bottom button in left cluster
14	Left button in left cluster
15	Right button in left cluster
16	Center button in center cluster
axes	
0	Horizontal axis for left stick (negative left/positive right)
1	Vertical axis for left stick (negative up/positive down)
2	Horizontal axis for right stick (negative left/positive right)
3	Vertical axis for right stick (negative up/positive down)


            */