import { useState, useEffect } from "react";
import {
  Button,
  Table,
  Tag,
  Input,
  Tooltip,
  Space,
  Modal,
  Form,
  DatePicker,
  Mentions,
  Radio,
  Layout,
  Avatar,
} from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, MinusOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
const { Search } = Input;
const { Header, Footer, Sider, Content } = Layout;
import { db } from "./firebase/db";
import { useAuth } from "./firebase/auth";
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"

function App() {
  const [user, authenticateUser] = useAuth();
  const [todos, setTodos] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [modalOpened, setModalOpened] = useState(false);
  const [form] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const [formFields, setFormFields] = useState(null);
  const [formName, setFormName] = useState("create");
  // map confirmed buttons, the key is todo's id, the value is whether its being deleted or not
  const [confirmedBtns, setConfirmedBtns] = useState(new Map());
  const [deletingMany, setDeletingMany] = useState(false);
  const todoRef = collection(db, "todo");

  console.log(user);

  const statusToTagColor = {
    "Open": "geekblue",    
    "Working": "purple",    
    "Done": "green",    
    "Overdue": "red",    
  }

  const visibleTodos =
    searchText === ""
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
            } else {
              hasMatch = propValue.toLowerCase().includes(iSearchText);
            }
          }

          return hasMatch;
        });

  useEffect(() => {
    getDocs(collection(db, "todo")).then(data => {
      const todos = data.docs.map(todo => ({ ...todo.data(), id: todo.id }) );
      setTodos(todos);
    });
  }, []);

  const toFilterValue = (value) => ({
    text: value[0].toUpperCase() + value.slice(1),
    value: value,
  })

  // We know there are going to be only these 4 statuses
  // There is no need to get them dynamicaly from todos
  const statuses = ["Open", "Working", "Overdue", "Done"];
  const statusFilters = statuses.map(toFilterValue);
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
    if (confirmedBtns.has(id)) {
      setConfirmedBtns((map) => new Map(map).set(id, true));
      deleteTodo(id);
    } else {
      setConfirmedBtns((map) => new Map(map).set(id, false));
    }
  }

  async function deleteTodo(id) {
    try {
      await deleteDoc(doc(db, "todo", id));
    } catch (error) {
      setConfirmedBtns((map) => new Map(map).set(id, false));
      return false;
      
    }

    setConfirmedBtns((map) => {
      map = new Map(map);
      map.delete(id);
      return map;
    });

    setTodos((todos) => todos.filter((todo) => todo.id !== id));

    return true;
  }

  async function handleDeleteMany() {
    setDeletingMany(true);

    const todosToDelete = new Map([...confirmedBtns].filter(([_, beingDeleted]) => !beingDeleted));
    const deletePromises = [...todosToDelete]    
    .map(([id]) => new Promise(async (resolve, reject) => {
      try {
        await deleteDoc(doc(db, "todo", id));
        resolve(true);
      } catch (error) {
        reject(new Error(`DELETE of todo with id #${id} failed.`));
      }
    }));

    todosToDelete.forEach((_, id) => todosToDelete.set(id, true));
    setConfirmedBtns(new Map(todosToDelete));

    try {
      await Promise.all(deletePromises);
      setConfirmedBtns(new Map());
      setDeletingMany(false);
      setTodos(todos => todos.filter(({ id }) => !todosToDelete.has(id)))
    } catch (error) {
      console.log(error)
    }
  }

  function handleDeselectConfirmed() {
    setConfirmedBtns(new Map());
  }

  const columns = [
    {
      title: "Timestamp created",
      dataIndex: "timeStamp",
      key: "timeStamp",
      // This is a use of Object destructuring with assigning
      // new names(aliases) for the original property names
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#object_destructuring
      sorter: ({ timeStamp: timeStampA }, { timeStamp: timeStampB }) =>
        new Date(timeStampA) - new Date(timeStampB),
    },
    {
      title: "Task",
      dataIndex: "title",
      key: "title",
      sorter: ({ title: titleA }, { title: titleB }) => {
        if (titleA === titleB) return 0;
        return titleA > titleB ? 1 : -1;
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      sorter: ({ description: descA }, { description: descB }) => {
        if (descA === descB) return 0;
        return descA > descB ? 1 : -1;
      },
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      sorter: ({ dueDate: dueDateA }, { dueDate: dueDateB }, order) => {
        // both empty
        if ((dueDateA === dueDateB) === "") {
          return 0;
          // only first empty
        } else if (dueDateA === "") {
          return order === "ascend" ? 1 : -1;
          // only second empty
        } else if (dueDateB === "") {
          return order === "ascend" ? -1 : 1;
          // both have values
        } else {
          return new Date(dueDateA) - new Date(dueDateB);
        }
      },
    },
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      filters: tagsFilters,
      onFilter: (value, { tags }) => tags.includes(value),
      render: (tags, { id }) => {
        return (
          <>
            {tags.map((tag) => (
              <Tag key={tag + id} id={tag + id}>
                {tag.toUpperCase()}
              </Tag>
            ))}
          </>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: statusFilters,
      onFilter: (value, { status }) => status === value,
      render: (_, { status }) => {
        return (
          <Tag color={statusToTagColor[status]}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      render: (_, { id }) => {
        const isAwaitingResponse =
          confirmedBtns.has(id) && confirmedBtns.get(id);
        const isToBeConfirmed = confirmedBtns.has(id) && !confirmedBtns.get(id);

        return (
          <Space direction="horizontal">
            <Tooltip title="Edit" mouseEnterDelay={0.5}>
              <Button
                onClick={() => handleEditClick(id)}
                icon={<EditOutlined />}
              ></Button>
            </Tooltip>
            <Tooltip title="Delete" mouseEnterDelay={0.5}>
              <Button
                onClick={() => handleDeleteClick(id)}
                icon={<DeleteOutlined />}
                loading={isAwaitingResponse}
                danger={isToBeConfirmed}
              ></Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

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
  }

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
  }

  const onFinish = async ({ title, description, tags, status, dateRange }) => {
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

    setFormLoading(true);

    try {
      if (formName === "create") {
        await createTodo(todo)
      }      
      else if (formName === "update") {
        const id = form.getFieldValue("id");
        await updateTodo(todo, id);
      }
    } catch (error) {
      console.log(error)
    }

    setFormLoading(false);
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    textAlign: 'center',
    color: '#fff',
    height: "4rem",
    paddingInline: 50,
    lineHeight: '64px',
  };

  const contentStyle = {
    textAlign: 'center',
    minHeight: 120,
    lineHeight: '120px',
    paddingInline: 50,
    color: '#fff',
  };

  return (
    <Layout>
      <Header style={headerStyle}>
        <Search
          placeholder="input search text"
          onSearch={setSearchText}
          onChange={({ target }) => target.value === "" && setSearchText("")}
          style={{
            width: 400,
          }}
        />
        <Space>
          <Button
            type="default"
            icon={<PlusOutlined />}
            size="middle"
            onClick={handleCreateClick}
          >
            Create
          </Button>
          {confirmedBtns.size ? (
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
          ) : <></>}
          {confirmedBtns.size ? (
            <Button
            type="primary"
            icon={<MinusOutlined />}
            size="middle"
            onClick={handleDeselectConfirmed}
            disabled={deletingMany}
          >
            Cancel selection
          </Button>
          ) : <></>}
          <Avatar shape="square" icon={!!user ? <img src={user.photoURL} alt="avatar" /> : <UserOutlined />} onClick={authenticateUser} style={{cursor: "pointer"}} />
        </Space>
      </Header>
      <Content style={contentStyle}>
        <Table columns={columns} dataSource={visibleTodos} rowKey={(record) => record.id} />
      </Content>
      <Modal
        open={modalOpened}
        onCancel={handleModalCancel}
        title="Create new todo"
        footer={null}
      >
        <Space direction="vertical" align="center">
          <Form
            form={form}
            fields={formFields}
            disabled={formLoading}
            initialValues={{
              remember: true,
              dateRange: [dayjs(), null],
              status: "Open",
            }}
            name="create"
            labelCol={{
              span: 8,
            }}
            wrapperCol={{
              span: 16,
            }}
            style={{
              width: "100%",
            }}
            autoComplete="off"
            onFinish={onFinish}
          >
            <Form.Item
              label="Title"
              name="title"
              rules={[
                {
                  required: true,
                  message: "Please input todo's title!",
                },
                {
                  max: 100,
                  message: "Maximum title length is 100 characters.",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
              rules={[
                {
                  required: true,
                  message: "Please provide some description.",
                },
                {
                  max: 1000,
                  message: "Maximum description lenght is 1000 characters.",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="Due Date" name="dateRange">
              <DatePicker.RangePicker disabled={[true, false]} />
            </Form.Item>

            <Form.Item label="Tags" name="tags">
              <Mentions
                placeholder="input # to mention tag"
                prefix={["#"]}
                options={(tagsFilters || []).map(({ value }) => ({
                  key: value,
                  value,
                  label: value,
                }))}
              />
            </Form.Item>

            <Form.Item label="Status" name="status" required={true}>
              <Radio.Group
                options={
                  formName === "create"
                    ? ["Open", "Working"]
                    : ["Open", "Working", "Done", "Overdue"]
                }
                optionType="button"
                buttonStyle="solid"
                size="small"
              />
            </Form.Item>

            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit" loading={formLoading}>
                {formName.toUpperCase()}
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </Layout>
  );
}

export default App;
