const SLOGANS: &[&str] = &[
    "Không nhậu đời không nể! 🍻",
    "Nhậu là nghệ thuật, say là đẳng cấp! 🎨",
    "Cuộc đời ngắn lắm, nhậu đi đừng ngại! 🌟",
    "Một ly không say, hai ly chưa đủ! 🥂",
    "Bạn bè là để nhậu cùng! 👥",
    "Hôm nay không nhậu, mai hối hận! 😎",
    "Tiền tiêu hết, tình bạn còn mãi! 💪",
    "Bia lạnh, bạn thân, cuộc đời tươi đẹp! 🍺",
    "Nhậu để quên buồn, vui để nhớ bạn! 🎉",
    "Sống là để nhậu, nhậu để sống vui! 🌈",
    "Trăm năm bia đá, nghìn năm bia ôm! 🏆",
    "Chia bill rõ ràng, tình bạn bền lâu! 💰",
    "Uống có trách nhiệm, chia có công bằng! ⚖️",
    "Ly này tôi mời, ly sau bạn trả! 🤝",
    "Nhậu không say, lần sau ai mời! 🍾",
    "Đời là những cuộc nhậu bất tận! ♾️",
    "Có bạn có bia, có bia có vui! 🎊",
    "Cạn ly đi, chuyện đời tính sau! 🥃",
    "Không say không về, về thì phải tỉnh! 🚗",
    "Chia tiền công bằng, ai cũng vui lòng! 😄",
    "Một người vì mọi người, mọi người vì bia! 🍻",
    "Nhậu hôm nay, lo ngày mai! 📅",
    "Tiền chia đều, vui chia đôi! 💸",
    "Bạn nhậu tốt, bạn đời tốt hơn! ❤️",
    "Ly bia kết nối, tình bạn thăng hoa! 🌸",
    "Say là tạm thời, kỷ niệm là mãi mãi! 📸",
    "Nhậu ít nói nhiều, nhậu nhiều... quên nói! 🤫",
    "Chia bill như chia sẻ, công bằng như tình bạn! 🤗",
    "Đừng để tiền bạc làm hỏng cuộc vui! 💵",
    "Uống vì đam mê, chia vì công bằng! 🎯",
];

pub fn get_random_slogan() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as usize)
        .unwrap_or(0);
    SLOGANS[seed % SLOGANS.len()].to_string()
}
