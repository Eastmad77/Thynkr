// /game/avatars.js
export const Avatars = {
  free: {
    default: { mascot: "/media/avatars/fox-default.png" },
  },
  pro: {
    owl: { mascot: "/media/avatars/owl-pro.png" },
    panda: { mascot: "/media/avatars/panda-pro.png" },
    cat: { mascot: "/media/avatars/cat-pro.png" },
    fox: { mascot: "/media/avatars/fox-happy.png" },
    eagle: { mascot: "/media/avatars/eagle-pro.png" },
    wolf: { mascot: "/media/avatars/wolf-pro.png" },
    dragon: { mascot: "/media/avatars/dragon-pro.png" },
  },

  get(type = "free", key = "default") {
    return this[type][key]?.mascot || this.free.default.mascot;
  },
};
