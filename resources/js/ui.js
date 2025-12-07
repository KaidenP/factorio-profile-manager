// Sample Data
const app = new Application();

document.addEventListener('contextmenu', event => event.preventDefault());

function init() {
    loadingUI.init()
    app.load(profile_data => {
        setupSorting();
        setupSearch();
        renderTable(profile_data);
        setupWindowBar();
        setupFooterActions();
    })
}

init();

// let inspect = {};
//
// (async function(){
//     let promises = []
//
//     promises.push(new Promise(resolve => {
//         Neutralino.os.getEnvs().then(env=>{
//             inspect.env = env;
//             resolve();
//         })
//     }))
//
//     inspect.paths={};
//     ["config", "data", "cache", "documents", "pictures", "music", "video", "downloads", "saveGames1", "saveGames2", "temp"].forEach(pathname=>{
//         promises.push(new Promise(resolve =>{
//             Neutralino.os.getPath(pathname).then(path=>{
//                 inspect.paths[pathname] = path;
//                 resolve();
//             })
//         }))
//     })
//
//     inspect.constants = {};
//     Object.keys(window)
//         .filter(v=> !!v.match(/^NL_/))
//         .forEach(key=>inspect.constants[key] = window[key]);
//
//     inspect.computer = {};
//
//     Object.keys(Neutralino.computer).forEach(key=>{
//         if (typeof Neutralino.computer[key] !== 'function') return;
//         promises.push(new Promise(resolve=>{
//             Neutralino.computer[key]().then(res=>{
//                 inspect.computer[key] = res;
//                 resolve();
//             })
//         }))
//     });
//
//     await Promise.all(promises)
//
//     await Neutralino.filesystem.writeFile('./info.json', JSON.stringify(inspect, null, 2));
//     Neutralino.os.open('info.json')
// })();