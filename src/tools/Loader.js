const path = require("path");
const ToolManager = require("../core/ToolManager");

class ToolLoader {

    load() {

        ToolManager.load(
            path.join(__dirname)
        );

    }

}

module.exports = new ToolLoader();
