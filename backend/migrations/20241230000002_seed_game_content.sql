-- Seed more game content for all game types
-- This migration adds comprehensive game questions/challenges

-- Truth or Dare - Truth questions
INSERT INTO game_content (game_type, content_type, content, difficulty) VALUES
-- Easy
('truth_or_dare', 'truth', 'Crush đầu tiên của bạn là ai?', 'easy'),
('truth_or_dare', 'truth', 'Bạn có bao nhiêu người yêu cũ?', 'easy'),
('truth_or_dare', 'truth', 'Lần cuối bạn khóc là khi nào?', 'easy'),
('truth_or_dare', 'truth', 'Điều bạn sợ nhất là gì?', 'easy'),
('truth_or_dare', 'truth', 'Bạn có hay stalking người khác trên mạng không?', 'easy'),
('truth_or_dare', 'truth', 'Người trong nhóm này bạn thích nhất là ai?', 'easy'),
('truth_or_dare', 'truth', 'Bạn có bao giờ nói xấu ai trong nhóm này không?', 'easy'),
-- Medium
('truth_or_dare', 'truth', 'Bí mật mà bạn chưa từng kể cho ai?', 'medium'),
('truth_or_dare', 'truth', 'Điều hối tiếc nhất trong tình yêu của bạn?', 'medium'),
('truth_or_dare', 'truth', 'Bạn có từng ghen với ai trong nhóm không?', 'medium'),
('truth_or_dare', 'truth', 'Lần cuối bạn nói dối là khi nào và về chuyện gì?', 'medium'),
('truth_or_dare', 'truth', 'Nếu phải chọn 1 người trong nhóm để hẹn hò, bạn chọn ai?', 'medium'),
('truth_or_dare', 'truth', 'Điều điên rồ nhất bạn đã làm vì tình yêu?', 'medium'),
('truth_or_dare', 'truth', 'Bạn có từng đọc trộm tin nhắn của người khác không?', 'medium'),
-- Hard
('truth_or_dare', 'truth', 'Bạn đã từng phản bội ai chưa?', 'hard'),
('truth_or_dare', 'truth', 'Điều xấu hổ nhất bạn đã làm khi say?', 'hard'),
('truth_or_dare', 'truth', 'Bạn có từng thích người yêu của bạn bè không?', 'hard'),
('truth_or_dare', 'truth', 'Fantasy bí mật nhất của bạn là gì?', 'hard'),
('truth_or_dare', 'truth', 'Điều bạn ghét nhất ở bản thân?', 'hard'),

-- Truth or Dare - Dare challenges
-- Easy
('truth_or_dare', 'dare', 'Đăng 1 story selfie ngay bây giờ', 'easy'),
('truth_or_dare', 'dare', 'Nhắn tin "Em nhớ anh/chị" cho người cuối chat', 'easy'),
('truth_or_dare', 'dare', 'Bắt chước tiếng động vật trong 30 giây', 'easy'),
('truth_or_dare', 'dare', 'Để người bên cạnh đăng 1 status lên Facebook của bạn', 'easy'),
('truth_or_dare', 'dare', 'Uống 1 shot không dùng tay', 'easy'),
('truth_or_dare', 'dare', 'Làm mặt xấu và chụp ảnh', 'easy'),
-- Medium
('truth_or_dare', 'dare', 'Gọi điện cho crush cũ và nói "Anh/em vẫn nhớ"', 'medium'),
('truth_or_dare', 'dare', 'Để người khác chọn 1 bài hát và bạn phải hát', 'medium'),
('truth_or_dare', 'dare', 'Comment vào bài post mới nhất của người lạ', 'medium'),
('truth_or_dare', 'dare', 'Nhảy sexy dance trong 1 phút', 'medium'),
('truth_or_dare', 'dare', 'Gọi điện cho bố mẹ và nói "Con yêu bố mẹ"', 'medium'),
('truth_or_dare', 'dare', 'Cho người bên trái quyết định đồ uống tiếp theo của bạn', 'medium'),
-- Hard
('truth_or_dare', 'dare', 'Uống 3 shot liên tiếp', 'hard'),
('truth_or_dare', 'dare', 'Đổi quần áo với người đối diện trong 5 phút', 'hard'),
('truth_or_dare', 'dare', 'Tỏ tình giả với người ngồi bên trái', 'hard'),
('truth_or_dare', 'dare', 'Để nhóm chọn và bạn phải nhắn tin theo', 'hard'),
('truth_or_dare', 'dare', 'Làm 20 cái hít đất hoặc uống 2 shot', 'hard'),

-- Never Have I Ever
-- Easy
('never_have_i_ever', 'question', 'Tôi chưa bao giờ trốn học/trốn làm', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ nói dối bố mẹ', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ ăn cắp vặt', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ xem phim người lớn', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ block ai trên mạng xã hội', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ giả vờ ốm để nghỉ', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ stalk người yêu cũ', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ khóc vì phim', 'easy'),
-- Medium
('never_have_i_ever', 'question', 'Tôi chưa bao giờ hôn người lạ', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ bị bắt quả tang làm điều xấu', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ gửi tin nhắn cho nhầm người', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ có hơn 1 người yêu cùng lúc', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ nói xấu bạn thân sau lưng', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ bị đuổi khỏi quán bar/club', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ làm điều gì đó illegal', 'medium'),
-- Hard
('never_have_i_ever', 'question', 'Tôi chưa bao giờ one night stand', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ gửi ảnh 18+ cho ai', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ phản bội người yêu', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ thử chất kích thích', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ làm chuyện ấy nơi công cộng', 'hard'),

-- Challenges
-- Easy
('challenge', 'action', 'Selfie với người lạ gần nhất', 'easy'),
('challenge', 'action', 'Nói tiếng Anh trong 2 phút tiếp theo', 'easy'),
('challenge', 'action', 'Massage vai cho người bên phải', 'easy'),
('challenge', 'action', 'Kể 1 joke và phải làm người khác cười', 'easy'),
('challenge', 'action', 'Đứng bằng 1 chân trong 1 phút', 'easy'),
('challenge', 'action', 'Rap về chủ đề bia trong 30 giây', 'easy'),
('challenge', 'action', 'Bắt chước giọng của 1 người trong nhóm', 'easy'),
-- Medium
('challenge', 'action', 'Uống hết ly mà không được dùng tay', 'medium'),
('challenge', 'action', 'Đọc rap 1 đoạn freestyle về nhóm', 'medium'),
('challenge', 'action', 'Gọi điện cho ai đó và nói "Tôi yêu bạn"', 'medium'),
('challenge', 'action', 'Plank trong 1 phút, fail = 2 shot', 'medium'),
('challenge', 'action', 'Nhảy TikTok dance trend', 'medium'),
('challenge', 'action', 'Để người khác makeup cho bạn', 'medium'),
('challenge', 'action', 'Ăn 1 thứ mà người khác chọn (không quá kinh)', 'medium'),
-- Hard
('challenge', 'action', 'Body shot với người đối diện', 'hard'),
('challenge', 'action', 'Chống đẩy 30 cái hoặc uống 3 shot', 'hard'),
('challenge', 'action', 'Để nhóm vẽ lên mặt bạn', 'hard'),
('challenge', 'action', 'Hát karaoke 1 bài không được nhìn lời', 'hard'),
('challenge', 'action', 'Đi ra ngoài và hỏi số điện thoại người lạ', 'hard'),
('challenge', 'action', 'Tắt đèn và kể chuyện ma trong 2 phút', 'hard'),
('challenge', 'action', 'Catwalk từ đầu phòng đến cuối phòng', 'hard'),
-- Extreme
('challenge', 'action', 'Uống 5 shot liên tiếp', 'extreme'),
('challenge', 'action', 'Cởi 1 món đồ (giày dép không tính)', 'extreme'),
('challenge', 'action', 'Để người khác post bất cứ gì lên story của bạn', 'extreme'),
('challenge', 'action', 'Gọi cho người yêu cũ và xin lỗi', 'extreme'),
('challenge', 'action', 'Thực hiện 1 dare do cả nhóm vote chọn', 'extreme'),

-- ============================================
-- THÊM CÂU HỎI HÓC BÚA VÀ THÚ VỊ HƠN
-- ============================================

-- Truth or Dare - SPICY TRUTHS
('truth_or_dare', 'truth', 'Nếu được quay lại quá khứ, mối quan hệ nào bạn sẽ không bắt đầu?', 'hard'),
('truth_or_dare', 'truth', 'Bạn đã từng có feelings với người yêu của bạn bè chưa?', 'hard'),
('truth_or_dare', 'truth', 'Điều gì bạn làm mà nếu người yêu biết sẽ chia tay ngay?', 'extreme'),
('truth_or_dare', 'truth', 'Bạn có từng fake orgasm không?', 'extreme'),
('truth_or_dare', 'truth', 'Người trong nhóm này bạn muốn "thử" nhất là ai?', 'extreme'),
('truth_or_dare', 'truth', 'Bạn đã từng sexting với ai chưa? Kể chi tiết', 'extreme'),
('truth_or_dare', 'truth', 'Điều kinky nhất bạn từng làm là gì?', 'extreme'),
('truth_or_dare', 'truth', 'Bạn có từng chụp/quay video 18+ không?', 'extreme'),
('truth_or_dare', 'truth', 'Lần đầu tiên của bạn như thế nào? Kể đi', 'extreme'),
('truth_or_dare', 'truth', 'Bạn có fetish gì đặc biệt không?', 'extreme'),
('truth_or_dare', 'truth', 'Ai là người bạn nghĩ đến khi "tự sướng"?', 'extreme'),
('truth_or_dare', 'truth', 'Bạn đã từng làm chuyện ấy ở đâu kỳ lạ nhất?', 'extreme'),
('truth_or_dare', 'truth', 'Số người bạn đã ngủ cùng là bao nhiêu? Thành thật đi', 'extreme'),
('truth_or_dare', 'truth', 'Bạn có từng threesome hoặc muốn thử không?', 'extreme'),
('truth_or_dare', 'truth', 'Điều gì bạn muốn thử trong phòng ngủ nhưng chưa dám nói?', 'extreme'),

-- Truth or Dare - AWKWARD TRUTHS  
('truth_or_dare', 'truth', 'Bạn có từng giả vờ thích ai để lợi dụng họ không?', 'hard'),
('truth_or_dare', 'truth', 'Điều tệ nhất bạn từng nói sau lưng ai trong nhóm này?', 'hard'),
('truth_or_dare', 'truth', 'Bạn ghen tị điều gì nhất ở người ngồi đối diện?', 'medium'),
('truth_or_dare', 'truth', 'Nếu phải đuổi 1 người khỏi nhóm, bạn chọn ai?', 'hard'),
('truth_or_dare', 'truth', 'Ai trong nhóm bạn thấy annoying nhất? Vì sao?', 'hard'),
('truth_or_dare', 'truth', 'Bạn có từng lợi dụng ai vì tiền không?', 'hard'),
('truth_or_dare', 'truth', 'Điều gì bạn biết về người trong nhóm mà họ không muốn ai biết?', 'extreme'),
('truth_or_dare', 'truth', 'Bạn đánh giá bản thân mấy điểm về ngoại hình? Thành thật đi', 'medium'),
('truth_or_dare', 'truth', 'Ai trong nhóm bạn nghĩ sẽ chết già một mình?', 'hard'),
('truth_or_dare', 'truth', 'Bạn có từng mơ thấy ai trong nhóm này trong giấc mơ 18+ không?', 'extreme'),

-- Truth or Dare - EMBARRASSING TRUTHS
('truth_or_dare', 'truth', 'Kể về lần bạn bị bắt gặp đang làm chuyện xấu hổ', 'medium'),
('truth_or_dare', 'truth', 'Thói quen kỳ lạ nhất của bạn khi ở một mình?', 'medium'),
('truth_or_dare', 'truth', 'Bạn có từng ngửi quần áo để check xem có mặc lại được không?', 'easy'),
('truth_or_dare', 'truth', 'Lần cuối bạn tắm là khi nào? Thành thật nhé', 'easy'),
('truth_or_dare', 'truth', 'Bạn có từng ị ra quần khi đã lớn chưa?', 'hard'),
('truth_or_dare', 'truth', 'Điều gì bạn làm trong toilet lâu như vậy?', 'medium'),

-- Truth or Dare - WILD DARES
('truth_or_dare', 'dare', 'Liếm khuỷu tay người bên cạnh', 'medium'),
('truth_or_dare', 'dare', 'Ngồi lên đùi người đối diện trong 1 vòng', 'hard'),
('truth_or_dare', 'dare', 'Để người bên phải whisper vào tai bạn điều bẩn nhất họ nghĩ', 'hard'),
('truth_or_dare', 'dare', 'Mô tả chi tiết cảm giác khi bạn "đến đỉnh"', 'extreme'),
('truth_or_dare', 'dare', 'Làm tiếng rên giả trong 30 giây', 'extreme'),
('truth_or_dare', 'dare', 'Gửi tin nhắn "Em đang nghĩ về anh" cho người cuối cùng trong danh bạ', 'hard'),
('truth_or_dare', 'dare', 'Cắn môi người bên trái nhẹ nhàng', 'extreme'),
('truth_or_dare', 'dare', 'Để ai đó trong nhóm slap mông bạn', 'hard'),
('truth_or_dare', 'dare', 'Làm lap dance cho người được nhóm chọn', 'extreme'),
('truth_or_dare', 'dare', 'Hôn cổ người bên phải', 'extreme'),
('truth_or_dare', 'dare', 'Strip poker với người đối diện - thua cởi 1 món', 'extreme'),
('truth_or_dare', 'dare', 'Để người khác vẽ lên người bạn (vùng cho phép)', 'hard'),
('truth_or_dare', 'dare', 'Nhắn tin cho crush thật và nói "Em thích anh"', 'hard'),
('truth_or_dare', 'dare', 'Post ảnh xấu nhất của bạn lên story', 'medium'),
('truth_or_dare', 'dare', 'Gọi video cho bố mẹ ngay bây giờ', 'medium'),

-- Never Have I Ever - SPICY
('never_have_i_ever', 'question', 'Tôi chưa bao giờ làm chuyện ấy khi say', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ có crush với thầy/cô giáo', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ xem phim 18+ ở nơi công cộng', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ bị bắt gặp đang "tự sướng"', 'extreme'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ làm trong toilet công cộng', 'extreme'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ gửi nudes cho người yêu', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ role-play trong phòng ngủ', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ dùng đồ chơi người lớn', 'extreme'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ làm với người hơn 10 tuổi', 'extreme'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ bị caught đang xem phim 18+', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ có friends with benefits', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ làm vì tiền hoặc quà', 'extreme'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ quay video lúc làm', 'extreme'),

-- Never Have I Ever - AWKWARD
('never_have_i_ever', 'question', 'Tôi chưa bao giờ nói "I love you" mà không thật lòng', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ hack tài khoản của người yêu', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ đọc trộm nhật ký/tin nhắn của người khác', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ giả vờ bận để không gặp ai đó', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ unfriend người ngồi đây', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ screenshot chat để share với người khác', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ gọi nhầm tên người yêu', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ quên anniversary/sinh nhật người yêu', 'medium'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ so sánh người yêu với người khác', 'hard'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ nói xấu người ngồi đây sau lưng họ', 'hard'),

-- Never Have I Ever - EMBARRASSING
('never_have_i_ever', 'question', 'Tôi chưa bao giờ té trước đám đông', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ nói chuyện một mình', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ đi nhầm toilet nam/nữ', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ vẫy tay lại với người không vẫy tay với mình', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ kéo cửa đẩy/đẩy cửa kéo', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ gọi thầy/cô là mẹ/bố', 'easy'),
('never_have_i_ever', 'question', 'Tôi chưa bao giờ ợ/xì hơi trước mặt crush', 'medium'),

-- Challenges - DRINKING GAMES
('challenge', 'action', 'Uống mỗi khi ai đó nói tên bạn trong 5 phút tới', 'medium'),
('challenge', 'action', 'Mix 3 loại đồ uống và uống hết', 'hard'),
('challenge', 'action', 'Chơi beer pong với người đối diện, thua uống đôi', 'hard'),
('challenge', 'action', 'Uống không dùng tay, ai đỡ ly cho bạn', 'medium'),
('challenge', 'action', 'Shot rượu với muối và chanh, không được nhăn mặt', 'hard'),
('challenge', 'action', 'Rượu vòng - uống và truyền cho người tiếp theo trong 3 giây', 'medium'),

-- Challenges - PHYSICAL
('challenge', 'action', 'Cõng người nặng nhất nhóm đi 1 vòng', 'hard'),
('challenge', 'action', 'Đứng bằng tay (handstand) hoặc uống 2 shot', 'hard'),
('challenge', 'action', 'Nhảy dây 50 cái, mỗi lần miss = 1 shot', 'hard'),
('challenge', 'action', 'Arm wrestling với 3 người, thua = 3 shot', 'medium'),
('challenge', 'action', 'Squat 30 cái liên tục không nghỉ', 'hard'),
('challenge', 'action', 'Balance 1 chai trên đầu đi 5 bước', 'medium'),

-- Challenges - SOCIAL
('challenge', 'action', 'Đi xin số điện thoại của 3 người lạ trong 10 phút', 'hard'),
('challenge', 'action', 'Hát hết 1 bài karaoke bằng giọng opera', 'medium'),
('challenge', 'action', 'Gọi điện random và giả vờ là người quen', 'hard'),
('challenge', 'action', 'Thuyết trình 2 phút về chủ đề nhóm chọn', 'medium'),
('challenge', 'action', 'Bắt chước influencer nổi tiếng làm video 30 giây', 'medium'),
('challenge', 'action', 'Đọc rap diss 1 người trong nhóm (friendly)', 'medium'),
('challenge', 'action', 'Gọi đặt pizza và order bằng giọng hát', 'hard'),

-- Challenges - EMBARRASSING
('challenge', 'action', 'Đi ra đường và hét to "Tôi là người đẹp nhất"', 'hard'),
('challenge', 'action', 'Chạy vòng quanh quán/nhà 1 lần', 'medium'),
('challenge', 'action', 'Tạo dáng như đang chụp ảnh thời trang 10 kiểu', 'medium'),
('challenge', 'action', 'Giả vờ là waiter/waitress phục vụ nhóm trong 5 phút', 'medium'),
('challenge', 'action', 'Nói bằng accent nước ngoài trong 3 phút', 'easy'),
('challenge', 'action', 'Diễn lại scene phim nổi tiếng một mình', 'medium'),

-- Challenges - EXTREME PARTY
('challenge', 'action', 'Body shot từ rốn người được chọn', 'extreme'),
('challenge', 'action', 'Để nhóm chọn outfit cho bạn từ đồ có sẵn', 'hard'),
('challenge', 'action', 'Uống mà không nuốt trong 1 phút', 'hard'),
('challenge', 'action', 'Kiss or Slap - chọn 1 người và họ chọn kiss hay slap', 'extreme'),
('challenge', 'action', 'Truth or Shot - trả lời câu hỏi của nhóm hoặc uống', 'hard'),
('challenge', 'action', 'Để người khác chọn và bạn phải làm dare tiếp theo không biết trước', 'extreme')
ON CONFLICT DO NOTHING;
