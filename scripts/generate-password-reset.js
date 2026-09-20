const crypto = require("crypto");
const path = require("path");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
    quiet: true
});

const prisma = require("../src/prisma");

const TOKEN_TTL_MINUTES = 15;

async function main() {
    if (!process.env.ADMIN_TENANT_ID) {
        throw new Error(
            "ADMIN_TENANT_ID não configurado."
        );
    }

    const admin = await prisma.user.findFirst({
        where: {
            tenantId: process.env.ADMIN_TENANT_ID,
            role: "ADMIN"
        },
        select: {
            id: true
        }
    });

    if (!admin) {
        throw new Error(
            "Usuário ADMIN não encontrado."
        );
    }

    const token = crypto
        .randomBytes(32)
        .toString("hex");

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const expiresAt = new Date(
        Date.now() +
        TOKEN_TTL_MINUTES * 60 * 1000
    );

    await prisma.$transaction(async (tx) => {
        // Invalida tokens anteriores ainda não utilizados.
        await tx.passwordResetToken.updateMany({
            where: {
                userId: admin.id,
                usedAt: null
            },
            data: {
                usedAt: new Date()
            }
        });

        await tx.passwordResetToken.create({
            data: {
                userId: admin.id,
                tokenHash,
                expiresAt
            }
        });
    });

    console.log("");
    console.log(
        "Token de recuperação criado com sucesso."
    );
    console.log("");
    console.log(
        `Validade: ${TOKEN_TTL_MINUTES} minutos`
    );
    console.log("");
    console.log(
        "TOKEN (exibido somente agora):"
    );
    console.log(token);
    console.log("");
    console.log(
        "Não compartilhe este token."
    );
}

main()
    .catch((err) => {
        console.error(
            "ERRO:",
            err.message
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
