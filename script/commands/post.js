module.exports.config = {
  name: "confess",
  version: "1.1.0",
  permission: 0,
  credits: "nics (modified by request)",
  prefix: false,
  premium: false,
  description: "Create a new text-only post with a watermark counter",
  category: "operator",
  cooldowns: 5,
};

let postCounter = 1; // Initialize the counter for watermarking posts

module.exports.run = async ({ event, api, args }) => {
  const { threadID, messageID, senderID } = event;

  const watermark = `confess#${String(postCounter).padStart(2, "0")}`; // Generate the watermark
  const uuid = getGUID();

  const formData = {
    input: {
      composer_entry_point: "inline_composer",
      composer_source_surface: "timeline",
      idempotence_token: uuid + "_FEED",
      source: "WWW",
      audience: {
        privacy: {
          allow: [],
          base_state: "EVERYONE", // Set to everyone by default
          deny: [],
          tag_expansion_state: "UNSPECIFIED",
        },
      },
      message: {
        ranges: [],
        text: "",
      },
      actor_id: api.getCurrentUserID(),
      client_mutation_id: Math.floor(Math.random() * 17),
    },
  };

  return api.sendMessage(
    `Reply to this message with the content of your post. The watermark "${watermark}" will be added automatically.`,
    threadID,
    (e, info) => {
      const handlee = {
        name: this.config.name,
        messageID: info.messageID,
        author: senderID,
        formData,
        watermark,
        type: "content",
      };
      global.client.handleReply.get(api.getCurrentUserID()).push(handlee);
    },
    messageID
  );
};

module.exports.handleReply = async ({ event, api, handleReply }) => {
  const { formData, watermark, type, author } = handleReply;

  if (event.senderID !== author) return;

  const { threadID, messageID } = event;

  if (type === "content") {
    if (event.body === "0" || event.body.trim() === "") {
      return api.sendMessage("Post content cannot be empty. Please try again.", threadID, messageID);
    }

    formData.input.message.text = `${event.body}\n\n${watermark}`; // Append the watermark to the post content

    const form = {
      av: api.getCurrentUserID(),
      fb_api_req_friendly_name: "ComposerStoryCreateMutation",
      fb_api_caller_class: "RelayModern",
      doc_id: "7711610262190099",
      variables: JSON.stringify(formData),
    };

    api.httpPost("https://www.facebook.com/api/graphql/", form, (err, res) => {
      api.unsendMessage(handleReply.messageID);
      try {
        if (err) throw err;
        if (typeof res === "string") res = JSON.parse(res.replace("for (;;);", ""));

        const postID = res.data.story_create.story.legacy_story_hideable_id;
        const urlPost = res.data.story_create.story.url;

        if (!postID) throw res.errors;

        postCounter++; // Increment the counter for the next post

        return api.sendMessage(
          `Post created successfully!\n\nPost ID: ${postID}\nLink: ${urlPost}`,
          threadID,
          messageID
        );
      } catch (error) {
        return api.sendMessage("Failed to create post. Please try again later.", threadID, messageID);
      }
    });
  }
};

function getGUID() {
  let sectionLength = Date.now();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor((sectionLength + Math.random() * 16) % 16);
    sectionLength = Math.floor(sectionLength / 16);
    return (c === "x" ? r : (r & 7) | 8).toString(16);
  });
}
