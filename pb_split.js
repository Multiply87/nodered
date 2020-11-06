module.exports = function(RED) {
    function Pb_SplitNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function (msg) {
            RED.log.info(JSON.stringify(config));

            const FIRST_TASK = (config.typefirstTask === 'num' ? config.firstTask : msg[config.firstTask]) || 0;  //Задержка первой таски
            const SPLIT_DELAY = (config.typedelay === 'num' ? config.delay : msg[config.delay]) || 1000; //Интервал отправки таски
            const SPLIT_DELIMITER = config.splitBy.replace(/\\t/g, "\t")
                                                  .replace(/\\n/g, "\n")
                                                  .replace(/\\r/g, "\r") || "\n"; //разбить строку по указанному символу
            
            // Проверка на число
            if (isNaN(Number(FIRST_TASK)) || isNaN(Number(SPLIT_DELAY))){
                throw(`Указаны некорректные значения First Task: ${FIRST_TASK} или Interval: ${SPLIT_DELAY}`);
                return;
            }

            function sendTask(payload, options = {}){                
                options.len = options.len ? options.len : payload.length;
                let len = payload.length;
                let data = payload.shift();
                let obj = Object.assign({}, msg);
                obj.payload = data;
                obj._msgid = generateMsgId();
                obj.parts = {
                        count: options.len,
                        index: options.len - len,
                        id: msg._msgid
                };
                delete obj.splitDelay;
                delete obj.firstTask;
                node.send(obj);
                
                if(payload.length > 0) {                    
                    setTimeout(sendTask, options.delay, payload, options);                    
                    node.status(payload.length);
                }else{
                    node.status('');
                }                
            }

            //Генерация _msgid
            function generateMsgId() {
                return 'xxxxxxxx.xxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
                });
            }            

            //Проверка на массив с данными
            if (typeof msg.payload === "object") {                               
                if(!Array.isArray(msg.payload) || msg.payload.length > 0){
                    msg.payload = Object.entries(msg.payload).map(el => {
                        return {key: el[0], value: el[1]};  
                    })
                }                
            } else if(typeof msg.payload === "string"){
                msg.payload = msg.payload.split(SPLIT_DELIMITER);
            } else { 
                try{
                    msg.payload = JSON.stringify(msg.payload);
                }catch(e){}
                throw(`Не массив/объект или нулевая длина msg.payload: ${msg.payload}`);
                //RED.log.error(`Не массив или пустой массив msg.payload: ${msg.payload}`);
            }
            let options = {
                delay: SPLIT_DELAY
            }; 
            setTimeout(sendTask, FIRST_TASK, msg.payload, options);
            return;
        });
    }
    RED.nodes.registerType("pb_split",Pb_SplitNode);
}