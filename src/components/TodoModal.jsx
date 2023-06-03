import {
    DatePicker,
    Form,
    Input,
    Modal,
    Radio,
    Space,
    Button,
    Mentions,
  } from "antd";
  import dayjs from "dayjs";
  
  const TodoModal = ({
    title,
    isOpened,
    onCancel,
    formRef,
    fields,
    isLoading,
    onFinish,
    tags,
    type,
  }) => {
    return (
      <Modal open={isOpened} onCancel={onCancel} title={title} footer={null}>
        <Space direction="vertical" align="center">
          <Form
            form={formRef}
            fields={fields}
            disabled={isLoading}
            initialValues={{
              remember: true,
              dateRange: [dayjs(), null],
              status: "Open",
            }}
            name={type}
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
                options={(tags || []).map(({ value }) => ({
                  key: value,
                  value,
                  label: value,
                }))}
              />
            </Form.Item>
  
            <Form.Item label="Status" name="status" required={true}>
              <Radio.Group
                options={
                  type === "create"
                    ? ["Open", "Working"]
                    : ["Open", "Working", "Done", "Overdue"]
                }
                optionType="button"
                buttonStyle="solid"
                size="small"
              />
            </Form.Item>
  
            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                {type.toUpperCase()}
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    );
  };
  
  export default TodoModal;
  