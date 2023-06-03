import { DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";
import { Table, Tooltip, Avatar, Tag, Space, Button } from "antd";

const toFilterValue = (value) => ({
  text: value[0].toUpperCase() + value.slice(1),
  value: value,
});

const statusToTagColor = {
  Open: "geekblue",
  Working: "purple",
  Done: "green",
  Overdue: "red",
};

// We know there are going to be only these 4 statuses
// There is no need to get them dynamicaly from todos
const statuses = ["Open", "Working", "Overdue", "Done"];
const statusFilters = statuses.map(toFilterValue);

const TodoTable = ({
  users,
  todos,
  loggedInUser,
  selectedTodos,
  deleteTodo,
  editTodo,
}) => {
  const isLoggedIn = !!loggedInUser;

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
      title: "Author",
      dataIndex: "author",
      key: "author",
      render: (_, { author }) => {
        return (
          <Tooltip title={users[author]?.name ?? "Anonymous"} placement="top">
            <Avatar
              shape="circle"
              icon={
                !!users[author]?.photoURL ? (
                  <img src={users[author].photoURL} alt="avatar" />
                ) : (
                  <UserOutlined />
                )
              }
              style={{ backgroundColor: "#fff", color: "#001529" }}
            />
          </Tooltip>
        );
      },
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
        return <Tag color={statusToTagColor[status]}>{status}</Tag>;
      },
    },
    {
      title: "Actions",
      render: (_, { id, author }) => {
        const isAwaitingResponse =
          selectedTodos.has(id) && selectedTodos.get(id);
        const isToBeConfirmed = selectedTodos.has(id) && !selectedTodos.get(id);
        const userIsAuthor = isLoggedIn && loggedInUser.uid === author;

        if (!userIsAuthor) return <></>;

        return (
          <Space direction="horizontal">
            <Tooltip title="Edit" mouseEnterDelay={0.5}>
              <Button
                onClick={() => editTodo(id)}
                icon={<EditOutlined />}
                disabled={!userIsAuthor}
              ></Button>
            </Tooltip>
            <Tooltip title="Delete" mouseEnterDelay={0.5}>
              <Button
                onClick={() => deleteTodo(id)}
                icon={<DeleteOutlined />}
                loading={isAwaitingResponse}
                danger={isToBeConfirmed}
                disabled={!userIsAuthor}
              ></Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={todos}
      rowKey={(record) => record.id}
    />
  );
};

export default TodoTable;
