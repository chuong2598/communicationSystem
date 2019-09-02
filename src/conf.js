const configuration = {
  'iceServers': [
    {
      "urls": "stun:e-lab.host:5349"
    },
    {
      "urls": "turn:e-lab.host:5349?transport=udp",
      "username": "lcq",
      "credential": "lcq"
    },

    {
      "urls": "turn:e-lab.host:5349?transport=tcp",
      "username": "lcq",
      "credential": "lcq"
    }

  ]
}

export default configuration