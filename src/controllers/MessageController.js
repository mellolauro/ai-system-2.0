const Orchestrator =
    require("../core/Orchestrator");

class MessageController {

    async process(request) {

        return Orchestrator.execute(
            request
        );

    }

    async http(req, res) {

        try {

            const result =
                await this.process({

                    tenantId:
                        req.body.tenantId,

                    userId:
                        req.body.userId,

                    channel:
                        req.body.channel ||
                        "api",

                    externalUserId:
                        req.body.externalUserId,

                    agentContext:
                        req.body.agentContext ||
                        "client",

                    message:
                        req.body.message

                });

            return res.json({

                success: true,

                data: result

            });

        } catch (err) {

            console.error(err);

            return res.status(500).json({

                success: false,

                error:
                    err.message

            });

        }

    }

}

module.exports =
    new MessageController();
