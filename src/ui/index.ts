import * as modals from './modals';
import * as window from './window';
import LoadingUI from "./loading";
import * as table from "./table";
import { dialog } from "./dialog";

const UI: any = function (app: any) {
    UI.app = app;

    window.setup(app);
    modals.init(app);
    table.setup(app);
};

UI.modals = modals;
UI.window = window;
UI.loading = LoadingUI;
UI.table = table;
UI.dialog = dialog;

export default UI;
