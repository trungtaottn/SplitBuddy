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
('challenge', 'action', 'Thực hiện 1 dare do cả nhóm vote chọn', 'extreme')
ON CONFLICT DO NOTHING;
