const { sendToAgent } = require("./openclawClient");

async function test() {

  const res = await sendToAgent(
    "default",
    "session1",
    "Olá, tudo bem?"
  );

  console.log(res);

}

test();
