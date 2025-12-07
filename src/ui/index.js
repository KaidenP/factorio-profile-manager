import * as modals from './modals';
import LoadingUI from "./loading";
import windowSetup from "./window"
import * as table from "./table";
import {dialog} from "./dialog";

export default function UI(app) {
    UI.app = app;

    windowSetup(app);
    modals.init(app);
    table.setup(app);
}

UI.modals = modals;
UI.loading = LoadingUI;
UI.table = table;
UI.dialog = dialog;