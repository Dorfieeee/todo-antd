import { createServer, Model, Response } from "miragejs";
import todos from "./todos";

export default function () {
  let nextTodoIdentifier = 21;

  createServer({
    models: {
      todo: Model,
    },

    seeds(server) {
      todos.forEach((todo) => {
        server.schema.todos.create(todo);
      });
    },

    routes() {
      this.namespace = "api";
      this.timing = 1500;

      this.get("/todos", (schema) => {
        return {
          todos: schema.todos.all().models,
        };
      });

      this.delete("/todos/:id", (schema, request) => {
        let id = request.params.id;
        try {
          schema.todos.find(id).destroy();
        } catch (error) {
          return new Response(
            400,
            {},
            { error: `Todo with id #${id} could not be deleted.` }
          );
        }
        return new Response(204);
      });

      this.post("/todos", (schema, request) => {
        const todo = JSON.parse(request.requestBody);

        try {
          if (!todo.title) throw new Error("Todo has no title");
          todo.id = nextTodoIdentifier++;
          schema.todos.create(todo);
        } catch (error) {
          return new Response(400, {}, { error: error });
        }

        return new Response(200, {}, todo);
      });

      this.put("/todos/:id", (schema, request) => {
        const todo = JSON.parse(request.requestBody);
        schema.todos.find(todo.id).update(todo);
        return todo;
      })
    },
  });
}
