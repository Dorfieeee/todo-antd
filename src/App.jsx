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
} from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
const { Search } = Input;

const TO_BE_CONFIRMED = 0;
const AWAITING_RESPONSE = 1;

function App() {
  const [todos, setTodos] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [modalOpened, setModalOpened] = useState(false);
  const [form] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const [formFields, setFormFields] = useState(null);
  const [formName, setFormName] = useState("create");
  const [action, setAction] = useState({
    id: null,
    state: null,
  });

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
    fetch("/api/todos")
      .then((res) => res.json())
      .then((data) => {
        setTodos(data.todos);
      });
  }, []);

  // We know there are going to be only these 4 statuses
  // There is no need to get them dynamicaly from todos
  const statusFilters = ["Open", "Working", "Overdue", "Done"];
  // Tags are unknown in advance so it needs to be extracted from todos
  const tagsFilters = todos
    ? Array.from(
        todos.reduce((uniqueTags, { tags }) => {
          for (const tag of tags) {
            uniqueTags.add(tag);
          }
          return uniqueTags;
        }, new Set())
      ).map((tag) => ({
        text: tag[0].toUpperCase() + tag.slice(1),
        value: tag,
      }))
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

    let todo = todos.find(todo => todo.id === id);

    todo = {
      ...todo,
      remember: true,
      dateRange: [dayjs(todo.timeStamp), todo.dueDate !== "" ? dayjs(todo.dueDate) : null],
      tags: todo.tags.map(tag => "#" + tag).join(" ") ?? "",
    }

    for (const key in todo) {
      fieldData.push({
        name: [key],
        value: todo[key]
      });
    }

    setFormFields(fieldData);
    setFormName("update");
    setModalOpened(true);
  }

  function handleDeleteClick(id) {
    const { state, id: actionId } = action;

    if (state === null || actionId !== id) {
      setAction({
        id: id,
        state: TO_BE_CONFIRMED,
      });
    } else if (state === TO_BE_CONFIRMED && actionId === id) {
      deleteTodo();
    }
  }

  function resetAction() {
    setAction({ id: null, state: null });
  }

  function deleteTodo() {
    const { id } = action;

    setAction((prev) => ({
      ...prev,
      state: AWAITING_RESPONSE,
    }));

    fetch("/api/todos/" + id, {
      method: "DELETE",
    }).then((res) => {
      if (!res.ok) return;
      resetAction();
      setTodos(todos.filter((todo) => todo.id !== id));
    });
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
              <Tag key={tag + id}>{tag.toUpperCase()}</Tag>
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
    },
    {
      title: "Actions",
      render: (_, { id }) => {
        const isAwaitingResponse =
          action.id === id && action.state === AWAITING_RESPONSE;
        const isToBeConfirmed =
          action.id === id && action.state === TO_BE_CONFIRMED;

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
                danger={isAwaitingResponse || isToBeConfirmed}
              ></Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  /* 
  TODO:
  Create new two functions, createTodo and updateTodo so when
  onFinish => if formName = create -> createTodo(), if formName = update -> updateTodo()  
  */
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
    todo.timeStamp = dateRange[0].format("YYYY-MM-DD");
    todo.dueDate = dateRange[1]?.format("YYYY-MM-DD") ?? "";

    todo.id = form.getFieldValue("id") ?? "";

    const method = formName === "create" ? "POST" : "PUT";
    const path = formName === "create" ? "/api/todos" : "/api/todos/" + todo.id;

    const options = {
      method: method,
      body: JSON.stringify(todo),
    };

    setFormLoading(true);

    const response = await fetch(path, options);

    if (response.ok) {
      const newTodo = await response.json();

      if (method === "POST") {
        form.resetFields();
        setTodos((prevTodos) => ([
          ...prevTodos,
          newTodo,
        ]));
      } else {
        setTodos(prevTodos => {
          const updatedTodos = [...prevTodos];
          const updatingTodo = updatedTodos.find(t => t.id === todo.id);
          for (const key in newTodo) {
            updatingTodo[key] = newTodo[key];
          }
          return updatedTodos;
        })
      }


    } else {
      console.log(`Error while ${method} ${path}.`);
    }

    setFormLoading(false);
  };

  return (
    <>
      <Space.Compact block size="middle">
        <Search
          placeholder="input search text"
          onSearch={setSearchText}
          onChange={({ target }) => target.value === "" && setSearchText("")}
          style={{
            width: 300,
          }}
        />
        <Button
          type="default"
          icon={<PlusOutlined />}
          size="middle"
          onClick={handleCreateClick}
        >
          Create
        </Button>
      </Space.Compact>
      <Table columns={columns} dataSource={visibleTodos} />
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
              label="Task"
              name="title"
              rules={[
                {
                  required: true,
                  message: "Please input todo's title!",
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="Description" name="description">
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

            <Form.Item label="Status" name="status">
              <Radio.Group
                options={["Open", "Working"]}
                // onChange={({ target: { value } }) => setStatusOption(value)}
                optionType="button"
                buttonStyle="solid"
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
    </>
  );
}

export default App;
