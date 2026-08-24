const ConversationRepository =
    require("../database/repositories/ConversationRepository");

const MessageRepository =
    require("../database/repositories/MessageRepository");

const SessionManager =
    require("./SessionManager");

class MemoryManager {

    async load({
        session,
        userId,
        tenantId
     }) {

        if (!session) {
           throw new Error("Session é obrigatória.");
        }

        let conversation;

        if (session.conversationId) {

           conversation =
               await ConversationRepository.findById(
                   session.conversationId
               );

           if (!conversation) {
              throw new Error(
                  "Conversation da sessão não encontrada."
              );
           }

        } else {

            conversation =
                 await ConversationRepository.create({
                     userId,
                     tenantId
                 });

             SessionManager.setConversation(
                 session,
                 conversation.id
             );

          }   

          const history =
              await MessageRepository.history(
                  conversation.id
              );

          return {
              conversation,
              history
          };
    }

    async saveUserMessage({

        conversationId,

        content

    }) {

        if (!conversationId) {

            throw new Error(
                "conversationId é obrigatório."
            );

        }

        return MessageRepository.save({

            conversationId,

            role: "user",

            content

        });

    }

    async saveAssistantMessage({

        conversationId,

        content

    }) {

        if (!conversationId) {

            throw new Error(
                "conversationId é obrigatório."
            );

        }

        return MessageRepository.save({

            conversationId,

            role: "assistant",

            content

        });

    }

    async clear(conversationId) {

        return MessageRepository.clear(
            conversationId
        );

    }

}

module.exports = new MemoryManager();
