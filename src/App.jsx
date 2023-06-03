import { useState, useEffect, useMemo } from "react";
import { Button, Input, Space, Form, Layout, Avatar, Popconfirm } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
const { Search } = Input;
const { Header, Content } = Layout;
import { db } from "./firebase/db";
import { useAuth } from "./firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import TodoTable from "./components/TodoTable";
import TodoModal from "./components/TodoModal";

function App() {
  const [user, authenticateUser] = useAuth();
  const isLoggedIn = !!user;
  const [todos, setTodos] = useState([]);
  const [users, setUsers] = useState({});
  const [searchText, setSearchText] = useState("");
  const [modalOpened, setModalOpened] = useState(false);
  const [form] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const [formFields, setFormFields] = useState(null);
  const [formName, setFormName] = useState("create");
  // map confirmed buttons, the key is todo's id, the value is whether its being deleted or not
  const [selectedTodos, setSelectedTodos] = useState(new Map());
  const [deletingMany, setDeletingMany] = useState(false);
  const todoRef = collection(db, "todo");

  const visibleTodos = useMemo(() => {
    return searchText === ""
      ? todos
      : todos.filter((todo) => {
          const iSearchText = searchText.toLowerCase();
          const propsToCheck = [
            "timeStamp",
            "dueDate",
            "tags",
            "status",
            "description",
            "title",
            "author",
          ];
          let hasMatch = false;
          // loop until match found or there is nothing left to check
          while (!hasMatch && propsToCheck.length > 0) {
            const prop = propsToCheck.pop();
            const propValue = todo[prop];
            // tags is Array and I also want to check if the tag only starts with the search value
            if (prop === "tags") {
              hasMatch = propValue.some((value) =>
                value.toLowerCase().startsWith(iSearchText)
              );
            } else if (prop === "author") {
              hasMatch = users[propValue].name
                .toLowerCase()
                .includes(iSearchText);
            } else {
              hasMatch = propValue.toLowerCase().includes(iSearchText);
            }
          }

          return hasMatch;
        });
  }, [todos, searchText]);

  useEffect(() => {
    getDocs(collection(db, "todo")).then((data) => {
      const todos = data.docs.map((todo) => ({ ...todo.data(), id: todo.id }));
      setTodos(todos);
    });
  }, [user]);

  useEffect(() => {
    getDocs(collection(db, "users")).then((data) => {
      const users = data.docs.reduce((obj, user) => {
        obj[user.id] = user.data();
        return obj;
      }, {});
      setUsers(users);
    });
  }, [user]);

  const toFilterValue = (value) => ({
    text: value[0].toUpperCase() + value.slice(1),
    value: value,
  });

  // Tags are unknown in advance so it needs to be extracted from todos
  const tagsFilters = todos
    ? Array.from(
        todos.reduce((uniqueTags, { tags }) => {
          for (const tag of tags) {
            uniqueTags.add(tag);
          }
          return uniqueTags;
        }, new Set())
      ).map(toFilterValue)
    : [];

  function handleCreateClick() {
    setFormName("create");
    setModalOpened(true);
  }

  function handleModalCancel() {
    setModalOpened(false);
    form.resetFields();
  }

  function handleEditClick(id) {
    const fieldData = [];

    let todo = todos.find((todo) => todo.id === id);

    todo = {
      ...todo,
      remember: true,
      dateRange: [
        dayjs(todo.timeStamp),
        todo.dueDate !== "" ? dayjs(todo.dueDate) : null,
      ],
      tags: todo.tags.map((tag) => "#" + tag).join(" ") ?? "",
    };

    for (const key in todo) {
      fieldData.push({
        name: [key],
        value: todo[key],
      });
    }

    setFormFields(fieldData);
    setFormName("update");
    setModalOpened(true);
  }

  function handleDeleteClick(id) {
    if (selectedTodos.has(id)) {
      setSelectedTodos((map) => new Map(map).set(id, true));
      deleteTodo(id);
    } else {
      setSelectedTodos((map) => new Map(map).set(id, false));
    }
  }

  async function deleteTodo(id) {
    try {
      await deleteDoc(doc(db, "todo", id));
    } catch (error) {
      setSelectedTodos((map) => new Map(map).set(id, false));
      return false;
    }

    setSelectedTodos((map) => {
      map = new Map(map);
      map.delete(id);
      return map;
    });

    setTodos((todos) => todos.filter((todo) => todo.id !== id));

    return true;
  }

  async function handleDeleteMany() {
    setDeletingMany(true);

    const todosToDelete = new Map(
      [...selectedTodos].filter(([_, beingDeleted]) => !beingDeleted)
    );
    const deletePromises = [...todosToDelete].map(
      ([id]) =>
        new Promise(async (resolve, reject) => {
          try {
            await deleteDoc(doc(db, "todo", id));
            resolve(true);
          } catch (error) {
            reject(new Error(`DELETE of todo with id #${id} failed.`));
          }
        })
    );

    todosToDelete.forEach((_, id) => todosToDelete.set(id, true));
    setSelectedTodos(new Map(todosToDelete));

    try {
      await Promise.all(deletePromises);
      setSelectedTodos(new Map());
      setDeletingMany(false);
      setTodos((todos) => todos.filter(({ id }) => !todosToDelete.has(id)));
    } catch (error) {
      console.log(error);
    }
  }

  function handleDeselectConfirmed() {
    setSelectedTodos(new Map());
  }

  const createTodo = async (todo) => {
    try {
      const newTodoRef = await addDoc(todoRef, todo);
      const newTodoDoc = await getDoc(newTodoRef);
      const newTodo = { ...newTodoDoc.data(), id: newTodoDoc.id };
      form.resetFields();
      setTodos((prevTodos) => [...prevTodos, newTodo]);
    } catch (error) {
      throw new Error("createTodo: " + error);
    }
  };

  const updateTodo = async (todo, id) => {
    try {
      await updateDoc(doc(db, "todo", id), todo);
      todo.id = id;
      setTodos((prevTodos) => {
        const updatedTodos = [...prevTodos];
        const updatingTodo = updatedTodos.find((t) => t.id === id);
        for (const key in updatingTodo) {
          updatingTodo[key] = todo[key];
        }
        return updatedTodos;
      });
    } catch (error) {
      throw new Error("updateTodo: " + error);
    }
  };

  const onFinish = async ({ title, description, tags, status, dateRange }) => {
    if (!isLoggedIn) return;

    const todo = {
      title,
      description,
      status,
    };

    todo.tags =
      tags
        ?.trim()
        .split("#")
        .filter((v) => !!v)
        .map((tag) => tag.trim()) ?? [];
    todo.tags = [...new Set(todo.tags)];
    todo.timeStamp = dateRange[0].format("YYYY-MM-DD");
    todo.dueDate = dateRange[1]?.format("YYYY-MM-DD") ?? "";
    todo.author = user.uid;

    setFormLoading(true);

    try {
      if (formName === "create") {
        await createTodo(todo);
      } else if (formName === "update") {
        const id = form.getFieldValue("id");
        await updateTodo(todo, id);
      }
    } catch (error) {
      console.log(error);
    }

    setFormLoading(false);
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    textAlign: "center",
    color: "#fff",
    height: "4rem",
    paddingInline: 50,
    lineHeight: "64px",
  };

  const contentStyle = {
    textAlign: "center",
    minHeight: 120,
    lineHeight: "120px",
    paddingInline: 50,
    color: "#fff",
  };

  return (
    <Layout>
      <Header style={headerStyle}>
        <Space>
          <Search
            placeholder="input search text"
            onSearch={setSearchText}
            onChange={({ target }) => target.value === "" && setSearchText("")}
            style={{
              width: 400,
              display: "block",
            }}
          />
          {!isLoggedIn ? (
            <Popconfirm
              title="Create new todo"
              description="You need to be loged in to create new todo. Do you want to log in?"
              onConfirm={authenticateUser}
              okText="Yes"
              cancelText="No"
            >
              <Button type="default" icon={<PlusOutlined />} size="middle">
                Create
              </Button>
            </Popconfirm>
          ) : (
            <Button
              type="default"
              icon={<PlusOutlined />}
              size="middle"
              onClick={handleCreateClick}
            >
              Create
            </Button>
          )}
        </Space>
        <Space>
          {selectedTodos.size ? (
            <Button
              type="primary"
              icon={<DeleteOutlined />}
              size="middle"
              onClick={handleDeleteMany}
              loading={deletingMany}
              danger
            >
              Delete selected
            </Button>
          ) : (
            <></>
          )}
          {selectedTodos.size ? (
            <Button
              type="primary"
              icon={<MinusOutlined />}
              size="middle"
              onClick={handleDeselectConfirmed}
              disabled={deletingMany}
            >
              Cancel selection
            </Button>
          ) : (
            <></>
          )}
          <Avatar
            shape="circle"
            icon={
              !!user ? (
                <img src={user.photoURL} alt="avatar" />
              ) : (
                <UserOutlined />
              )
            }
            onClick={authenticateUser}
            style={{
              cursor: "pointer",
              backgroundColor: "#fff",
              color: "#001529",
              display: "block",
            }}
          />
        </Space>
      </Header>
      <Content style={contentStyle}>
        <TodoTable
          todos={visibleTodos}
          users={users}
          loggedInUser={user}
          selectedTodos={selectedTodos}
          deleteTodo={handleDeleteClick}
          editTodo={handleEditClick}
        />
      </Content>
      <TodoModal
        type={formName}
        title={`${formName} todo`.toUpperCase()}
        isOpened={modalOpened}
        onCancel={handleModalCancel}
        onFinish={onFinish}
        formRef={form}
        fields={formFields}
        isLoading={formLoading}
        tags={tagsFilters}
      />
    </Layout>
  );
}

export default App;
