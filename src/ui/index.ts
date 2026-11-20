import * as modals from './modals';
import * as logins from './logins';
import LoadingUI from "./loading";
import windowSetup from "./window";
import * as table from "./table";
import { dialog } from "./dialog";

const UI: any = function (app: any) {
    UI.app = app;

    windowSetup(app);
    modals.init(app);
    logins.init(app);
    table.setup(app);
};

UI.modals = modals;
UI.logins = logins;
UI.loading = LoadingUI;
UI.table = table;
UI.dialog = dialog;

export default UI;
