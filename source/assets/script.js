function sendCommand(cmd,headers){
    return new Promise((res,rej)=>{
        fetch('/'+cmd,{
            method: 'POST',
            headers
        }).then(async r=>res(await r.text()))
        .catch(er=>rej(er))
    })
}

function showOne(holder,id){
Array.from(document.getElementById(holder).children).forEach(n=>n.classList.add('hidden'))
document.getElementById(id).classList.remove('hidden')
}
function act(i,b,t){
    document.getElementById('gui').classList[b?'add':'remove']('hidden');
    document.getElementById('tabs').classList[b?'add':'remove']('hidden');
    document.getElementById(i).classList[b?'add':'remove']('active')
}


function switchTab(tab) {
    document.querySelectorAll('.tabs button').forEach(button => button.classList.remove('active'));

    document.getElementById(`${tab}Tab`).classList.add('active');

    document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));

    document.getElementById(`${tab}-tab`).classList.add('active');
  }

function copy(id) {
    var input = document.createElement('textarea');
    input.innerText = document.getElementById(id).innerText;
    document.body.appendChild(input);
    input.select();
    var result = document.execCommand('copy');
    document.body.removeChild(input);
    return result;
}

async function saveConfig(){
    
}
const versions = [
    "1.12.2", "1.13.2", "1.14.4", "1.15.2",
    "1.16.5", "1.17.1", "1.18.2", "1.19.4", "1.20.1"
];
function updateVersionSmooth() {
    const slider = document.getElementById('versionSlider');
    const display = document.getElementById('versionDisplay');
    display.textContent = versions[slider.value];
}

function populateConfig(cfg){
    const accountname=document.getElementById('cfg_accountname')
    const host=document.getElementById('cfg_host')
    // const port=document.getElementById('cfg_port')
    // const proxyport=document.getElementById('cfg_proxyport')
    // const hideOnDisconnect=document.getElementById('cfg_hideOnDisconnect')
    const funtimeMode=document.getElementById('cfg_funtimeMode')
    // const GUIPort=document.getElementById('cfg_GUIPort')

    const versionDisplay=document.getElementById('versionDisplay')
    const versionSlider=document.getElementById('versionSlider')
    
    const vind=versions.indexOf(cfg.version)
    versionDisplay.innerText=cfg.version
    versionSlider.max=versions.length-1
    versionSlider.value=vind==-1?versions.length-1:vind
    
    accountname.value=cfg.accountname;
    host.value=cfg.host;
    // port.value=cfg.port;
    // proxyport.value=cfg.proxyport;
    // GUIPort.value=cfg.GUIPort;
    funtimeMode.checked=cfg.funtimeMode
    // hideOnDisconnect.checked=cfg.hideOnDisconnect
    
    saveConfig=async()=>{try{
        cfg.version=versionDisplay.innerText
        cfg.host=host.value
        cfg.accountname=accountname.value
        cfg.funtimeMode=funtimeMode.checked
        // cfg.port=+port.value
        // cfg.proxyport=+proxyport.value
        // cfg.GUIPort=+GUIPort.value
        // cfg.hideOnDisconnect=hideOnDisconnect.checked
        await sendCommand('saveConfig',{config:btoa(JSON.stringify(cfg,null,4))})
        alert("Конфиг сохранен, перезапустите хамелеон")
        await sendCommand('restart')

    }catch(err){alert(err.message);}}
}



async function main(){
    if(await sendCommand('checkProxy')=='false'){
        await sendCommand('startProxy')
    }
    const config=JSON.parse(await sendCommand('getConfig'))
    populateConfig(config)
    document.getElementById('ippc').innerText=config.proxyhost+':'+config.proxyport
    ips=(await sendCommand('getLocalIPS')).split('\n').join(':'+config.proxyport+'\n')
    document.getElementById('ipmb').value=ips
    const status1=document.getElementById('status1')
    const status2=document.getElementById('status2')
    setInterval(async()=>{
        const {c1,c2}=JSON.parse(await sendCommand('clientStatus'))
        status1.innerText=c1
        status1.style.color=c1=='Управляет'?'#00ff00':c1=='Подключен'?'#00ffd4':'#ff0000'
        status2.innerText=c2
        status2.style.color=c2=='Управляет'?'#00ff00':c2=='Подключен'?'#00ffd4':'#ff0000'
    },1000)
    setTimeout(()=>{
        loadingScreen.classList.add('hidden')
        document.getElementById('gui').classList.add('open');
        document.getElementById('logo').classList.add('shrink');
    },200)
    setTimeout(()=>switchTab('config'),1000)
}
// window.onload=main