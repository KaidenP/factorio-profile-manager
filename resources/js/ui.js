// Sample Data
const app = new Application();

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