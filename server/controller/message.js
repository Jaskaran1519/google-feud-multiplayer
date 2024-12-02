import Message from "../model/message.js";

export const saveMessage = async (req, res) => {
  try {
    const { roomId, player, content } = req.body;

    await Message.findOneAndUpdate(
      { roomId },
      { 
        $push: { 
          messages: {
            player,
            content,
            timestamp: new Date()
          }
        } 
      },
      { upsert: true }
    );

    res.status(201).json({ success: true, message: "Message saved successfully." });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to save message." });
  }
};

export const getMessagesByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const roomMessages = await Message.findOne({ roomId });

    res.status(200).json({ 
      success: true, 
      messages: roomMessages ? roomMessages.messages : [] 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to retrieve messages." });
  }
};

// module.exports = { saveMessage, getMessagesByRoom };
