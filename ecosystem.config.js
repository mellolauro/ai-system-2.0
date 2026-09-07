module.exports = {

    apps: [

        {

            name: "ai-system-2.0",



            script: "src/server.js",



            cwd: "/home/lauro/ai-system-2.0",



            interpreter:

                "/home/lauro/.nvm/versions/node/v24.18.0/bin/node",



            instances: 1,



            exec_mode: "fork",



            autorestart: true,



            watch: false,



            max_memory_restart: "500M",



            time: true,



            env: {

                NODE_ENV: "production"

            },



            error_file:

                "/home/lauro/.pm2/logs/ai-system-2.0-error.log",



            out_file:

                "/home/lauro/.pm2/logs/ai-system-2.0-out.log",



            merge_logs: true

        }

    ]

};
