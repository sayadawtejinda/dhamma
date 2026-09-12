import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Activity, Clock, Info, GripVertical, User, Heart, Cloud, Sun, Apple, Eye, Ear, Flower, Utensils, Brain, ChevronLeft, ChevronRight, RefreshCw, ChevronDown, Lock, Unlock, ChevronUp, Layers, Share2, ArrowDown } from 'lucide-react';

// NOTE: the raw source this was ported from initialized Firebase here using
// `typeof __firebase_config` / `typeof __app_id` / `typeof __initial_auth_token`
// globals -- artifacts of the AI-studio/"Canvas" sandbox it was originally
// generated in, which do not exist in this real deployed app. That made the
// whole auth+persistence block (a per-user cloud sync of the "arammana"
// settings below) permanently inert dead code: every path behind
// `if (!auth) return` / `if (!user || !db) return` always short-circuited.
// Deleted entirely here, same as this repo's Paramattha port did -- see
// src/Paramattha1App.jsx / src/Paramattha2App.jsx for the precedent.

// --- Tâm Sở Từ Điển (Cetasika Dictionary) ---
const CETASIKA_DICT = {
  "Xúc": { lakkana: "Chạm cảnh", rasa: "Giao sự va chạm giữa cảnh và thức", paccupatthana: "Sự gặp gỡ của Căn, Cảnh, Thức", padatthana: "Cảnh hiện rõ" },
  "Tư": { lakkana: "Kích thích các pháp đồng sanh hướng vào cảnh", rasa: "Gom các pháp đồng sanh", paccupatthana: "Sự sắp xếp hành động", padatthana: "Các pháp tương ưng (đồng sanh)" },
  "Nhất tâm": { lakkana: "An trú không xao lãng trên cảnh", rasa: "Gom các pháp đồng sanh", paccupatthana: "Trạng thái tĩnh lặng", padatthana: "Phần lớn là Thọ Lạc" },
  "Mạng căn": { lakkana: "Duy trì sự sống các pháp đồng sanh", rasa: "Làm sanh khởi các pháp đồng sanh", paccupatthana: "Trạng thái giữ vững sự duy trì", padatthana: "Pháp đáng được nuôi dưỡng" },
  "Tác ý": { lakkana: "Hướng thẳng đến cảnh", rasa: "Gắn kết với cảnh", paccupatthana: "Trạng thái hướng mặt về phía cảnh", padatthana: "Cảnh (Ārammaṇa)" },
  "Tầm": { lakkana: "Hướng tâm đến cảnh", rasa: "Đánh (chạm) vào cảnh lần đầu", paccupatthana: "Trạng thái lôi kéo tâm hướng đi", padatthana: "Cảnh" },
  "Tứ": { lakkana: "Suy sát, quan sát cảnh liên tục", rasa: "Gắn kết liên tục", paccupatthana: "Trạng thái nối kết tâm không dứt", padatthana: "Cảnh" },
  "Thắng giải": { lakkana: "Quyết định, xác định chắc chắn về cảnh", rasa: "Đối lập với sự hoài nghi", paccupatthana: "Trạng thái quyết định cảnh", padatthana: "Cảnh pháp cần quyết định" },
  "Tinh tấn": { lakkana: "Sự nỗ lực, ráng sức mạn mẽ", rasa: "Hỗ trợ, nâng đỡ các pháp đồng sanh", paccupatthana: "Trạng thái không thoái lui", padatthana: "Trí động tâm (Saṃvega)" },
  "Hỷ": { lakkana: "Thích thú cảnh", rasa: "Làm cho thân tâm thích thú no đầy", paccupatthana: "Trạng thái tươi vui phấn chấn", padatthana: "Cảnh" },
  "Dục": { lakkana: "Mong muốn thực hiện trên cảnh", rasa: "Tìm kiếm cảnh", paccupatthana: "Trạng thái khao khát, mong mỏi cảnh", padatthana: "Cảnh đáng mong muốn" },
  "Si": { lakkana: "Không biết, không thấy đúng bản chất sự thật", rasa: "Che lấp bản chất của cảnh", paccupatthana: "Làm phát sanh sự hành trì sai trái", padatthana: "Phi như lý tác ý (Ayoni somanasikāra)" },
  "Vô tàm": { lakkana: "Không ghê tởm pháp bất thiện", rasa: "Hành động một cách không xấu hổ", paccupatthana: "Trạng thái không chùn bước trước điều ác", padatthana: "Không tôn trọng bản thân" },
  "Vô quý": { lakkana: "Không sợ hãi pháp bất thiện", rasa: "Hành động một cách không lo sợ", paccupatthana: "Trạng thái không chùn bước trước điều ác", padatthana: "Không tôn trọng người khác" },
  "Trạo cử": { lakkana: "Tâm không an tịnh", rasa: "Không an trú vắng lặng", paccupatthana: "Trạng thái dao động không đứng yên", padatthana: "Phi như lý tác ý" },
  "Tham": { lakkana: "Chấp lấy cảnh là của ta", rasa: "Dính mắc mãnh liệt vào cảnh", paccupatthana: "Trạng thái không thể buông bỏ cảnh", padatthana: "Tà kiến nhìn nhận là tịnh, lạc (Subha)" },
  "Tà kiến": { lakkana: "Ghi nhận sai lầm là Thường, Lạc, Ngã, Tịnh", rasa: "Suy sát một cách sai lầm", paccupatthana: "Trạng thái ghi nhận bám chặt", padatthana: "Không muốn diện kiến các bậc Thánh" },
  "Ngã mạn": { lakkana: "Sự tự cao, kiêu ngạo", rasa: "Đề cao các pháp đồng sanh", paccupatthana: "Trạng thái muốn hơn mọi mặt", padatthana: "Tham không tương ưng tà kiến" },
  "Sân": { lakkana: "Tâm thô tháo, khắc nghiệt", rasa: "Thiêu đốt thân tâm dữ dội", paccupatthana: "Trạng thái phá hoại lợi ích", padatthana: "Vật gây thù hằn (Āghāta vatthu)" },
  "Tật đố": { lakkana: "Ganh tị với tài sản của người khác", rasa: "Không thể vui vẻ", paccupatthana: "Trạng thái quay mặt đi", padatthana: "Tài sản của người khác" },
  "Lẫn tiếc": { lakkana: "Giấu giếm tài sản của bản thân", rasa: "Không chịu được việc liên hệ với người khác", paccupatthana: "Trạng thái bỏn xẻn", padatthana: "Tài sản của mình" },
  "Trào hối": { lakkana: "Ăn năn, hối hận", rasa: "Buồn bã, lo âu lặp đi lặp lại", paccupatthana: "Trạng thái tâm nóng nảy nhớ lại liên tục", padatthana: "Ác nghiệp đã làm, thiện nghiệp chưa làm" },
  "Hôn trầm": { lakkana: "Sự không nỗ lực = Không hăng hái", rasa: "Phá hủy sự tinh tấn", paccupatthana: "Trạng thái thối lui", padatthana: "Sự lười biếng" },
  "Thụy miên": { lakkana: "Trạng thái không thể kham nhẫn", rasa: "Đóng cửa Thức và Căn", paccupatthana: "Trạng thái chùn bước khi bắt cảnh", padatthana: "Sự lười biếng" },
  "Hoài nghi": { lakkana: "Trạng thái nghi ngờ", rasa: "Sự chấn động của tâm", paccupatthana: "Không thể quyết định cảnh", padatthana: "Phi như lý tác ý" },
  "Tín": { lakkana: "Tin tưởng vào vật đáng tin", rasa: "Làm trong sạch các pháp đồng sanh", paccupatthana: "Trạng thái không vẩn đục", padatthana: "Vật đáng tin tưởng (Saddheyya vatthu)" },
  "Niệm": { lakkana: "Nhớ ghi chắc chắn trên cảnh", rasa: "Phá hủy sự lơ đễnh (Phóng dật)", paccupatthana: "Trạng thái gìn giữ tâm", padatthana: "Sự ghi nhớ vững chắc" },
  "Tàm": { lakkana: "Ghê tởm điều ác", rasa: "Không làm điều ác vì biết hổ thẹn", paccupatthana: "Trạng thái chùn bước trước điều ác", padatthana: "Tôn trọng chính mình" },
  "Quý": { lakkana: "Sợ hãi điều ác", rasa: "Không làm điều ác vì biết lo sợ", paccupatthana: "Trạng thái chùn bước trước điều ác", padatthana: "Tôn trọng người khác" },
  "Vô tham": { lakkana: "Tâm không say đắm trên cảnh", rasa: "Không chiếm hữu", paccupatthana: "Trạng thái không muốn dính mắc vào cảnh", padatthana: "Như lý tác ý" },
  "Vô sân": { lakkana: "Hành động mang lại lợi ích cho chúng sanh", rasa: "Đem đến lợi ích cho chúng sanh", paccupatthana: "Trạng thái phá trừ oán hận hiển lộ rõ qua trí", padatthana: "Như lý tác ý chỉ nhìn vào điểm đáng yêu của chúng sanh" },
  "Hành xả": { lakkana: "Thái độ trung lập với chúng sanh", rasa: "Nhìn sự bình đẳng không rơi vào thương hay ghét", paccupatthana: "Tạo ra sự tĩnh lặng thương ghét đối với chúng sanh", padatthana: "Trí quán nghiệp là tài sản duy nhất của mình" },
  "Tịnh thân": { lakkana: "Làm mát mẻ sự nóng nảy của tâm sở", rasa: "Phá hủy sự nóng nảy của tâm sở", paccupatthana: "Trạng thái an tịnh mát mẻ của tâm sở", padatthana: "Tâm sở" },
  "Tịnh tâm": { lakkana: "Làm mát mẻ sự nóng nảy của tâm", rasa: "Phá hủy sự nóng nảy của tâm", paccupatthana: "Trạng thái an tịnh mát mẻ của tâm", padatthana: "Tâm" },
  "Khinh thân": { lakkana: "Làm êm dịu sự nặng nề của tâm sở", rasa: "Phá hủy sự nặng nề của tâm sở", paccupatthana: "Trạng thái không nặng nề chậm chạp", padatthana: "Tâm sở" },
  "Khinh tâm": { lakkana: "Làm êm dịu sự nặng nề của tâm", rasa: "Phá hủy sự nặng nề của tâm", paccupatthana: "Trạng thái không nặng nề chậm chạp", padatthana: "Tâm" },
  "Nhu thân": { lakkana: "Làm êm dịu sự thô cứng của tâm sở", rasa: "Phá hủy sự thô cứng của tâm sở", paccupatthana: "Trạng thái không va chạm", padatthana: "Tâm sở" },
  "Nhu tâm": { lakkana: "Làm êm dịu sự thô cứng của tâm", rasa: "Phá hủy sự thô cứng của tâm", paccupatthana: "Trạng thái không va chạm", padatthana: "Tâm" },
  "Thích thân": { lakkana: "Làm êm dịu sự không kham nhẫn của tâm sở", rasa: "Phá hủy sự không kham nhẫn", paccupatthana: "Trạng thái hoàn hảo khi bắt cảnh", padatthana: "Tâm sở" },
  "Thích tâm": { lakkana: "Làm êm dịu sự không kham nhẫn của tâm", rasa: "Phá hủy sự không kham nhẫn", paccupatthana: "Trạng thái hoàn hảo khi bắt cảnh", padatthana: "Tâm" },
  "Thuần thân": { lakkana: "Trạng thái không bệnh hoạn của tâm sở", rasa: "Phá hủy sự bệnh hoạn", paccupatthana: "Trạng thái không lỗi lầm", padatthana: "Tâm sở" },
  "Thuần tâm": { lakkana: "Trạng thái không bệnh hoạn của tâm", rasa: "Phá hủy sự bệnh hoạn", paccupatthana: "Trạng thái không lỗi lầm", padatthana: "Tâm" },
  "Chánh thân": { lakkana: "Trạng thái ngay thẳng của tâm sở", rasa: "Phá hủy sự cong vẹo", paccupatthana: "Trạng thái không gian xảo", padatthana: "Tâm sở" },
  "Chánh tâm": { lakkana: "Trạng thái ngay thẳng của tâm", rasa: "Phá hủy sự cong vẹo", paccupatthana: "Trạng thái không gian xảo", padatthana: "Tâm" },
  "Trí tuệ": { lakkana: "Xuyên thấu hiểu rõ bản chất", rasa: "Soi sáng cảnh như ngọn đèn", paccupatthana: "Trạng thái không si mê", padatthana: "Định (Samādhi)" },
  "Tưởng": { lakkana: "Ghi nhớ để biết cảnh", rasa: "Biết lại bằng dấu ấn cũ", paccupatthana: "Tác ý cảnh theo tướng ghi nhớ", padatthana: "Mọi cảnh hiển lộ" },
  "Thọ Hỷ": { lakkana: "Cảm nhận cảnh tốt (Iṭṭhārammaṇa)", rasa: "Hưởng dụng cảnh", paccupatthana: "Trạng thái đáng vui thích", padatthana: "Sự an tịnh (Passaddhi)" },
  "Thọ Xả": { lakkana: "Cảm nhận sự trung lập trên cảnh trung bình", rasa: "Không quá phát triển, không quá hao mòn", paccupatthana: "Trạng thái bình tĩnh", padatthana: "Tâm không có Hỷ" },
  "Thọ Ưu": { lakkana: "Cảm nhận cảnh xấu (Aniṭṭhārammaṇa)", rasa: "Hưởng dụng cảnh", paccupatthana: "Trạng thái áp bức dựa vào tâm", padatthana: "Ý căn (Hadaya vatthu)" },
  "Thọ Khổ": { lakkana: "Cảm nhận vị của cảnh Xúc xấu", rasa: "Làm héo mòn các pháp đồng sanh", paccupatthana: "Trạng thái đau đớn phát sanh trên thân", padatthana: "Thân căn (Kāyindriya)" },
  "Thọ Lạc": { lakkana: "Cảm nhận vị của cảnh Xúc tốt", rasa: "Làm phát triển tột bậc các pháp đồng sanh", paccupatthana: "Trạng thái đáng vui thích phát sanh trên thân", padatthana: "Thân căn (Kāyindriya)" },
  "Chánh ngữ": { lakkana: "Trạng thái không vi phạm đối tượng của khẩu ác", rasa: "Chùn bước trước đối tượng khẩu ác", paccupatthana: "Trạng thái tránh xa không làm khẩu ác", padatthana: "Tín, Tàm, Quý" },
  "Chánh nghiệp": { lakkana: "Trạng thái không vi phạm đối tượng của thân ác", rasa: "Chùn bước trước thân ác", paccupatthana: "Trạng thái không làm thân ác", padatthana: "Tín, Tàm, Quý" },
  "Chánh mạng": { lakkana: "Trạng thái không vi phạm tà mạng", rasa: "Chùn bước trước tà mạng", paccupatthana: "Trạng thái không thực hành tà mạng", padatthana: "Tín, Tàm, Quý" },
  "Bi mẫn": { lakkana: "Trạng thái muốn dứt trừ đau khổ của chúng sanh", rasa: "Không thể chịu đựng được nỗi khổ của người khác", paccupatthana: "Không hãm hại chúng sanh", padatthana: "Như lý tác ý trên chúng sanh đang chịu đau khổ" },
  "Tùy hỷ": { lakkana: "Trạng thái hoan hỷ khi chúng sanh có tài sản đầy đủ", rasa: "Không ganh tị khi chúng sanh có tài sản đầy đủ", paccupatthana: "Phá trừ trạng thái không hoan hỷ", padatthana: "Như lý tác ý quán chiếu tài sản của chúng sanh hạnh phúc" }
};

// --- Thức Uẩn Từ Điển (Citta Dictionary) ---
const CITTA_DICT = {
  "Generic": { lakkana: "Biết cảnh = Lấy cảnh", rasa: "Làm chủ đạo đi đầu trong việc biết cảnh", paccupatthana: "Trạng thái nối kết tâm liên tục không đứt đoạn", padatthana: "Danh-Sắc" },
  "Kiết sanh": { lakkana: "Lấy một trong các cảnh (Nghiệp, Tướng nghiệp, Tướng thú) mà Đổng tốc Cận tử kiếp trước đã bắt", rasa: "Nối kết dòng tâm kiếp trước và kiếp sau", paccupatthana: "Trạng thái kết nối hai kiếp sống", padatthana: "Danh tâm sở đồng sanh + Sắc căn nương tựa" },
  "Hữu phần": { lakkana: "Lấy một trong các cảnh mà Đổng tốc Cận tử kiếp trước đã bắt", rasa: "Tồn tại như nguyên nhân của sinh hữu để dòng tâm trước sau không dứt đoạn", paccupatthana: "Trạng thái kết nối dòng tâm", padatthana: "Danh tâm sở đồng sanh + Sắc căn nương tựa" },
  "Ngũ môn hướng tâm": { lakkana: "Biết cảnh (Sắc, v.v...) = Lấy cảnh", rasa: "Tác ý cảnh ngũ (Sắc, v.v...) = Suy sát", paccupatthana: "Trạng thái hướng thẳng về phía cảnh", padatthana: "Tâm Hữu phần dứt dòng" },
  "Nhãn thức": { lakkana: "Biết Cảnh Sắc nương vào Nhãn căn", rasa: "Chỉ biết thuần túy màu sắc của Cảnh Sắc", paccupatthana: "Trạng thái hướng thẳng về Cảnh Sắc", padatthana: "Tâm Hướng môn diệt" },
  "Nhĩ thức": { lakkana: "Biết Cảnh Thinh nương vào Nhĩ căn", rasa: "Chỉ biết thuần túy âm thanh của Cảnh Thinh", paccupatthana: "Trạng thái hướng thẳng về Cảnh Thinh", padatthana: "Tâm Hướng môn diệt" },
  "Tỷ thức": { lakkana: "Biết Cảnh Khí nương vào Tỷ căn", rasa: "Chỉ biết thuần túy mùi của Cảnh Khí", paccupatthana: "Trạng thái hướng thẳng về Cảnh Khí", padatthana: "Tâm Hướng môn diệt" },
  "Thiệt thức": { lakkana: "Biết Cảnh Vị nương vào Thiệt căn", rasa: "Chỉ biết thuần túy vị của Cảnh Vị", paccupatthana: "Trạng thái hướng thẳng về Cảnh Vị", padatthana: "Tâm Hướng môn diệt" },
  "Thân thức": { lakkana: "Biết Cảnh Xúc nương vào Thân căn", rasa: "Chỉ biết thuần túy sự va chạm của Cảnh Xúc", paccupatthana: "Trạng thái hướng thẳng về Cảnh Xúc", padatthana: "Tâm Hướng môn diệt" },
  "Tiếp thâu": { lakkana: "Biết Cảnh Sắc v.v...", rasa: "Tiếp nhận Cảnh Sắc v.v...", paccupatthana: "Trạng thái tiếp nhận Cảnh Sắc v.v...", padatthana: "Nhãn thức v.v... diệt" },
  "Quan sát": { lakkana: "Biết 6 Cảnh", rasa: "Sàng lọc cảnh", paccupatthana: "Trạng thái quan sát sàng lọc cảnh", padatthana: "Sắc Ý căn nương tựa" },
  "Phân đoán": { lakkana: "Biết 6 Cảnh", rasa: "Quyết định cảnh ở Ngũ môn", paccupatthana: "Trạng thái quyết định cảnh ở Ngũ môn", padatthana: "Tâm Quan sát diệt" },
  "Thiện đổng tốc": { lakkana: "Trạng thái không có lỗi lầm, cho quả tốt", rasa: "Phá hủy điều bất thiện", paccupatthana: "Trạng thái trong trắng", padatthana: "Như lý tác ý" },
  "Bất thiện đổng tốc": { lakkana: "Trạng thái có lỗi lầm, mang lại hậu quả xấu", rasa: "Gây ra sự vô ích", paccupatthana: "Trạng thái làm vẩn đục dòng tâm", padatthana: "Phi như lý tác ý" },
  "Đồng sở duyên": { lakkana: "Biết 6 Cảnh", rasa: "Bắt theo cảnh mà Đổng tốc vừa bắt", paccupatthana: "Trạng thái bắt lại cảnh của Đổng tốc", padatthana: "Tâm Đổng tốc diệt" },
  "Ý môn hướng tâm": { lakkana: "Biết 6 Cảnh", rasa: "Suy sát cảnh hiện rõ ở Ý môn", paccupatthana: "Trạng thái suy sát cảnh hiện rõ ở Ý môn", padatthana: "Dòng Hữu phần dứt" },
  "Tiếu sanh": { lakkana: "Biết 6 Cảnh", rasa: "Tạo ra nụ cười chỉ ở các bậc A la hán", paccupatthana: "Trạng thái tạo ra nụ cười hoan hỷ", padatthana: "Chỉ nương tựa chắc chắn vào Ý căn" },
  "Tử tâm": { lakkana: "Biết một trong các cảnh mà Đổng tốc Cận tử kiếp trước đã bắt", rasa: "Sự chết, rời bỏ kiếp sống", paccupatthana: "Trạng thái dời bỏ kiếp sống", padatthana: "Hữu phần, Đồng sở duyên hoặc Đổng tốc diệt" },
  "Hữu phần khách": { lakkana: "Nối kết giữa Đổng tốc và Hữu phần không đồng thuận", rasa: "Làm trung gian dưới tư cách Hữu phần khách", paccupatthana: "Trạng thái bắt lại cảnh cũ", padatthana: "Đổng tốc và Hữu phần không đồng thuận" }
};

const getActiveCittaInfo = (name, javanaId) => {
    const n = name || "";
    if (n.includes("Kiết sanh")) return CITTA_DICT["Kiết sanh"];
    if (n.includes("Hữu phần khách")) return CITTA_DICT["Hữu phần khách"];
    if (n.includes("Hữu phần")) return CITTA_DICT["Hữu phần"];
    if (n.includes("Ngũ môn hướng tâm")) return CITTA_DICT["Ngũ môn hướng tâm"];
    if (n.includes("Nhãn thức")) return CITTA_DICT["Nhãn thức"];
    if (n.includes("Nhĩ thức")) return CITTA_DICT["Nhĩ thức"];
    if (n.includes("Tỷ thức")) return CITTA_DICT["Tỷ thức"];
    if (n.includes("Thiệt thức")) return CITTA_DICT["Thiệt thức"];
    if (n.includes("Thân thức")) return CITTA_DICT["Thân thức"];
    if (n.includes("Tiếp thâu")) return CITTA_DICT["Tiếp thâu"];
    if (n.includes("Quan sát")) return CITTA_DICT["Quan sát"];
    if (n.includes("Phân đoán")) return CITTA_DICT["Phân đoán"];
    if (n.includes("Ý môn hướng tâm")) return CITTA_DICT["Ý môn hướng tâm"];
    if (n.includes("Tiếu sanh")) return CITTA_DICT["Tiếu sanh"];
    if (n.includes("Tử tâm")) return CITTA_DICT["Tử tâm"];
    if (n.includes("Đồng sở duyên")) return CITTA_DICT["Đồng sở duyên"];
    if (n.includes("Đổng tốc") || n.includes("Đạo") || n.includes("Quả") || n.includes("Thiền") || n.includes("Chuẩn bị") || n.includes("Cận hành") || n.includes("Thuận thứ") || n.includes("Chuyển tộc") || n.includes("Tịnh diệu") || n.includes("Phi tưởng phi phi tưởng")) {
        if (javanaId && (javanaId.includes('akusala') || javanaId.includes('lobha') || javanaId.includes('dosa') || javanaId.includes('moha'))) {
            return CITTA_DICT["Bất thiện đổng tốc"];
        }
        return CITTA_DICT["Thiện đổng tốc"];
    }
    return CITTA_DICT["Generic"];
};

const toMyanmarNum = (n) => {
  return n.toString(); 
};

const SORT_ORDER = {
  "Tâm": 1,
  "Xúc": 2, "Thọ Hỷ": 3, "Thọ Xả": 4, "Thọ Ưu": 5, "Thọ Khổ": 5.5, "Thọ Lạc": 6, "Tưởng": 7, "Tư": 8, "Nhất tâm": 9, "Mạng căn": 10, "Tác ý": 11,
  "Tầm": 12, "Tứ": 13, "Thắng giải": 14, "Tinh tấn": 15, "Hỷ": 16, "Dục": 17,
  "Si": 18, "Vô tàm": 19, "Vô quý": 20, "Trạo cử": 21,
  "Tham": 22, "Tà kiến": 23, "Ngã mạn": 24, "Sân": 25, "Tật đố": 26, "Lẫn tiếc": 27, "Trào hối": 28, "Hoài nghi": 29, "Hôn trầm": 30, "Thụy miên": 31,
  "Tín": 32, "Niệm": 33, "Tàm": 34, "Quý": 35, "Vô tham": 36, "Vô sân": 37, "Hành xả": 38,
  "Tịnh thân": 39, "Tịnh tâm": 40, "Khinh thân": 41, "Khinh tâm": 42, "Nhu thân": 43, "Nhu tâm": 44,
  "Thích thân": 45, "Thích tâm": 46, "Thuần thân": 47, "Thuần tâm": 48, "Chánh thân": 49, "Chánh tâm": 50,
  "Chánh ngữ": 51, "Chánh nghiệp": 52, "Chánh mạng": 53,
  "Bi mẫn": 54, "Tùy hỷ": 55,
  "Trí tuệ": 56
};

const SABBACITTA = ["Xúc", "Thọ Hỷ", "Thọ Xả", "Thọ Ưu", "Thọ Khổ", "Thọ Lạc", "Tưởng", "Tư", "Nhất tâm", "Mạng căn", "Tác ý"];
const PAKINNAKA = ["Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục"]; 
const SOBHANA_SADHARANA = ["Tín", "Niệm", "Tàm", "Quý", "Vô tham", "Vô sân", "Hành xả", "Tịnh thân", "Tịnh tâm", "Khinh thân", "Khinh tâm", "Nhu thân", "Nhu tâm", "Thích thân", "Thích tâm", "Thuần thân", "Thuần tâm", "Chánh thân", "Chánh tâm"];
const NANA_KADACI = ["Ngã mạn", "Tật đố", "Lẫn tiếc", "Trào hối", "Hôn trầm", "Thụy miên", "Chánh ngữ", "Chánh nghiệp", "Chánh mạng", "Bi mẫn", "Tùy hỷ"];
const AKUSALA_OTHER = ["Si", "Vô tàm", "Vô quý", "Trạo cử", "Tham", "Tà kiến", "Sân", "Hoài nghi"];

const getCetasikaStyle = (name) => {
    if (name === "Tâm") return "bg-slate-800 text-white border-slate-600 hover:bg-slate-700 shadow-md";
    if (name === "Hỷ") return "bg-yellow-300 text-yellow-900 border-yellow-500 ring-2 ring-yellow-400 shadow-sm font-black hover:bg-yellow-400 scale-105 animate-pulse z-10";
    if (name === "Trí tuệ") return "bg-fuchsia-200 text-fuchsia-900 border-fuchsia-500 ring-1 ring-fuchsia-400 shadow-sm font-bold hover:bg-fuchsia-300 z-10";
    if (SABBACITTA.includes(name)) return "bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200";
    if (PAKINNAKA.includes(name)) return "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200";
    if (SOBHANA_SADHARANA.includes(name)) return "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200";
    if (NANA_KADACI.includes(name)) return "bg-orange-50 text-orange-900 border-orange-500 border-[2px] border-dashed hover:bg-orange-100 font-bold";
    if (AKUSALA_OTHER.includes(name)) return "bg-red-100 text-red-800 border-red-300 hover:bg-red-200";
    return "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200";
};

const getCittaColor = (name, javanaId) => {
    if (name.includes("Nhãn thức")) return { bg: 'bg-indigo-500 text-white border-indigo-600 ring-indigo-200', text: 'text-indigo-700' };
    if (name.includes("Nhĩ thức")) return { bg: 'bg-cyan-500 text-white border-cyan-600 ring-cyan-200', text: 'text-cyan-700' };
    if (name.includes("Tỷ thức")) return { bg: 'bg-fuchsia-500 text-white border-fuchsia-600 ring-fuchsia-200', text: 'text-fuchsia-700' };
    if (name.includes("Thiệt thức")) return { bg: 'bg-red-500 text-white border-red-600 ring-red-200', text: 'text-red-700' };
    if (name.includes("Thân thức")) return { bg: 'bg-lime-500 text-white border-lime-600 ring-lime-200', text: 'text-lime-700' };
    if (name.includes("Đồng sở duyên")) return { bg: 'bg-purple-500 text-white border-purple-600 ring-purple-200', text: 'text-purple-700' };
    if (name.includes("Kiết sanh") || name.includes("Tử tâm") || name.includes("Hữu phần") || name.includes("Quan sát") || name.includes("Tiếp thâu") || name.includes("Thức") || name.includes("Quả")) {
        return { bg: 'bg-blue-500 text-white border-blue-600 ring-blue-200', text: 'text-blue-700' }; 
    }
    if (name.includes("hướng tâm") || name.includes("Phân đoán") || name.includes("Duy tác") || name.includes("Tiếu sanh")) {
        return { bg: 'bg-amber-500 text-white border-amber-600 ring-amber-200', text: 'text-amber-700' }; 
    }
    // Đổng tốc Dục giới (Bất thiện)
if (javanaId && (javanaId.includes('akusala') || javanaId.includes('lobha') || javanaId.includes('dosa') || javanaId.includes('moha')) &&
    (name.includes("Đổng tốc") || name.includes("Duy tác") || name.includes("Thiện"))) {
    return { bg: 'bg-rose-500 text-white border-rose-600 ring-rose-200', text: 'text-rose-700' };
}
// Các sát na trước Đổng tốc
if (name.includes("Chuẩn bị") || name.includes("Cận hành") || name.includes("Thuận thứ") || name.includes("Chuyển tộc") || name.includes("Tịnh diệu")) {
    return { bg: 'bg-teal-400 text-white border-teal-500 ring-teal-200', text: 'text-teal-700' };
}
// Đổng tốc Kiên cố
if (name.includes("Đạo") || name.includes("Quả") || name.includes("Thiền") || name.includes("Thần thông") || name.includes("Phi tưởng phi phi tưởng")) {
    return { bg: 'bg-violet-500 text-white border-violet-600 ring-violet-200', text: 'text-violet-700' };
}
// Đổng tốc Dục giới thiện
if (name.includes("Đổng tốc") || name.includes("Thiện") || name.includes("Duy tác")) {
    return { bg: 'bg-emerald-500 text-white border-emerald-600 ring-emerald-200', text: 'text-emerald-700' };
}
    if (name.includes("Diệt tận định")) {
        return { bg: 'bg-slate-700 text-white border-slate-800 ring-slate-300', text: 'text-slate-800' }; 
    }
    return { bg: 'bg-slate-500 text-white border-slate-600 ring-slate-200', text: 'text-slate-700' };
};

const baseRupas = "Đất, Nước, Lửa, Gió, Màu, Mùi, Vị, Dưỡng tố";
const rupaKalapasData = {
  kayaDasaka: { title: 'Bọn 10 Thân (Kāya Dasaka)', elements: `${baseRupas}, Mạng căn, Thân căn`, icon: User, color: "text-emerald-600", bg: "bg-emerald-50" },
  bhavaDasaka: { title: 'Bọn 10 Tính (Bhāva Dasaka)', elements: `${baseRupas}, Mạng căn, Tính (Nam/Nữ)`, icon: Heart, color: "text-pink-600", bg: "bg-pink-50" },
  jivitaNavaka: { title: 'Bọn 9 Mạng căn (Jīvita Navaka)', elements: `${baseRupas}, Mạng căn`, icon: Activity, color: "text-purple-600", bg: "bg-purple-50" },
  cittajaAtthaka: { title: 'Bọn 8 Tâm sinh (Cittaja)', elements: baseRupas, icon: Cloud, color: "text-amber-600", bg: "bg-amber-50" },
  utujaAtthaka: { title: 'Bọn 8 Quý sinh (Utuja)', elements: baseRupas, icon: Sun, color: "text-orange-600", bg: "bg-orange-50" },
  aharajaAtthaka: { title: 'Bọn 8 Vật thực sinh (Āhāraja)', elements: baseRupas, icon: Apple, color: "text-lime-600", bg: "bg-lime-50" },
  hadayaDasaka: { title: 'Bọn 10 Ý căn (Hadaya Dasaka)', elements: `${baseRupas}, Mạng căn, Ý căn`, icon: Brain, color: "text-rose-600", bg: "bg-rose-50" },
  cakkhuDasaka: { title: 'Bọn 10 Nhãn căn (Cakkhu Dasaka)', elements: `${baseRupas}, Mạng căn, Nhãn căn`, icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
  sotaDasaka: { title: 'Bọn 10 Nhĩ căn (Sota Dasaka)', elements: `${baseRupas}, Mạng căn, Nhĩ căn`, icon: Ear, color: "text-cyan-600", bg: "bg-cyan-50" },
  ghanaDasaka: { title: 'Bọn 10 Tỷ căn (Ghāna Dasaka)', elements: `${baseRupas}, Mạng căn, Tỷ căn`, icon: Flower, color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
  jivhaDasaka: { title: 'Bọn 10 Thiệt căn (Jivhā Dasaka)', elements: `${baseRupas}, Mạng căn, Thiệt căn`, icon: Utensils, color: "text-red-600", bg: "bg-red-50" }
};

const getRupasForBase = (baseName) => {
  const common53 = [rupaKalapasData.kayaDasaka, rupaKalapasData.bhavaDasaka, rupaKalapasData.jivitaNavaka, rupaKalapasData.cittajaAtthaka, rupaKalapasData.utujaAtthaka, rupaKalapasData.aharajaAtthaka];
  if (baseName.includes("Ý căn-30")) return { title: "3 Bọn sắc phát sanh lúc Kiết sanh", list: [rupaKalapasData.hadayaDasaka, rupaKalapasData.kayaDasaka, rupaKalapasData.bhavaDasaka] };
  if (baseName.includes("Ý căn-46")) return { title: "5 Bọn sắc phát sanh ở thời Bình nhật (từ Hữu phần 1)", list: [rupaKalapasData.hadayaDasaka, rupaKalapasData.kayaDasaka, rupaKalapasData.bhavaDasaka, rupaKalapasData.cittajaAtthaka, rupaKalapasData.utujaAtthaka] };
  if (baseName.includes("Ý căn-63")) return { title: "63 Sắc phát sanh tại Ý căn (Ý môn)", list: [rupaKalapasData.hadayaDasaka, ...common53] };
  if (baseName.includes("Nhãn căn-63")) return { title: "63 Sắc phát sanh tại Nhãn căn (Mắt)", list: [rupaKalapasData.cakkhuDasaka, ...common53] };
  if (baseName.includes("Nhĩ căn-63")) return { title: "63 Sắc phát sanh tại Nhĩ căn (Tai)", list: [rupaKalapasData.sotaDasaka, ...common53] };
  if (baseName.includes("Tỷ căn-63")) return { title: "63 Sắc phát sanh tại Tỷ căn (Mũi)", list: [rupaKalapasData.ghanaDasaka, ...common53] };
  if (baseName.includes("Thiệt căn-63")) return { title: "63 Sắc phát sanh tại Thiệt căn (Lưỡi)", list: [rupaKalapasData.jivhaDasaka, ...common53] };
  if (baseName.includes("Thân căn-53")) return { title: "53 Sắc phát sanh tại Thân căn (Thân)", list: [...common53] };
  return null;
};

const FloatingControls = ({ handleReset, handlePrev, togglePlay, handleNext, isPlaying, currentIndex, totalLength }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  const onPointerDown = (e) => { setIsDragging(true); dragRef.current = { startX: e.clientX - position.x, startY: e.clientY - position.y }; e.target.setPointerCapture(e.pointerId); };
  const onPointerMove = (e) => { if (!isDragging) return; setPosition({ x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY }); };
  const onPointerUp = (e) => { setIsDragging(false); e.target.releasePointerCapture(e.pointerId); };

  return (
    <div className="absolute top-2 left-2 z-[60] flex items-center bg-white/95 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-slate-200" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
      <div className="px-3 cursor-move text-slate-400 hover:text-slate-600" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} title="Nhấn để di chuyển"><GripVertical className="w-5 h-5" /></div>
      <div className="w-px h-6 bg-slate-200 mx-1"></div>
      <div className="flex items-center gap-1.5 pr-2">
        <button onClick={handleReset} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-600 transition" title="Làm lại"><RotateCcw className="w-5 h-5" /></button>
        <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2.5 hover:bg-slate-100 disabled:opacity-30 rounded-full text-slate-600 transition" title="Lùi lại"><SkipBack className="w-5 h-5" /></button>
        <button onClick={togglePlay} className={`px-6 py-2.5 rounded-full flex items-center gap-2 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all ${isPlaying ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
          {isPlaying ? <><Pause className="w-4 h-4" /> Dừng</> : <><Play className="w-4 h-4 ml-1" /> Chạy</>}
        </button>
        <button onClick={handleNext} disabled={currentIndex === totalLength - 1} className="p-2.5 hover:bg-slate-100 disabled:opacity-30 rounded-full text-slate-600 transition" title="Tiến tới"><SkipForward className="w-5 h-5" /></button>
      </div>
    </div>
  );
};

const getBase = (vedana) => ["Tâm", "Xúc", vedana, "Tưởng", "Tư", "Nhất tâm", "Mạng căn", "Tác ý"];

const akusala4 = ["Si", "Vô tàm", "Vô quý", "Trạo cử"];
const set8_Upekkha = getBase("Thọ Xả");
const set8_Sukha = getBase("Thọ Lạc");
const set11 = [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải"];
const set12A = [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Hỷ"];
const set12B = [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn"];

const getLokuttaraCetasikas = (jhanaIdx) => {
    let base = getBase(jhanaIdx === 4 ? "Thọ Xả" : "Thọ Hỷ");
    let pakinnaka = [];
    if (jhanaIdx === 0) pakinnaka = ["Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục"];
    if (jhanaIdx === 1) pakinnaka = ["Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục"];
    if (jhanaIdx === 2) pakinnaka = ["Thắng giải", "Tinh tấn", "Hỷ", "Dục"];
    if (jhanaIdx === 3) pakinnaka = ["Thắng giải", "Tinh tấn", "Dục"];
    if (jhanaIdx === 4) pakinnaka = ["Thắng giải", "Tinh tấn", "Dục"];

    let sobhana = [...SOBHANA_SADHARANA];
    let virati = ["Chánh ngữ", "Chánh nghiệp", "Chánh mạng"];
    let panna = ["Trí tuệ"];

    return [...base, ...pakinnaka, ...sobhana, ...virati, ...panna];
};

const rupa1Base = [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"]; 
const rupa2Base = [...getBase("Thọ Hỷ"), "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"]; 
const rupa3Base = [...getBase("Thọ Hỷ"), "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"]; 
const rupa4Base = [...getBase("Thọ Hỷ"), "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"]; 
const rupa5Base = [...getBase("Thọ Xả"), "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"]; 
const arupaBase = [...getBase("Thọ Xả"), "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"]; 

const JAVANA_GROUPS = [
  {
    id: 'akusala_lobha', label: "Tham căn (8 loại)",
    options: [
      { id: 'ld1', label: "1. Thọ Hỷ Hợp tà Vô trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...akusala4, "Tham", "Tà kiến"] },
      { id: 'ld2', label: "2. Thọ Hỷ Hợp tà Hữu trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...akusala4, "Tham", "Tà kiến", "Hôn trầm", "Thụy miên"] },
      { id: 'ld3', label: "3. Thọ Hỷ Ly tà [Ngã mạn] Vô trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...akusala4, "Tham", "Ngã mạn"] },
      { id: 'ld4', label: "4. Thọ Hỷ Ly tà [Ngã mạn] Hữu trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...akusala4, "Tham", "Ngã mạn", "Hôn trầm", "Thụy miên"] },
      { id: 'ld5', label: "5. Thọ Xả Hợp tà Vô trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Tham", "Tà kiến"] },
      { id: 'ld6', label: "6. Thọ Xả Hợp tà Hữu trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Tham", "Tà kiến", "Hôn trầm", "Thụy miên"] },
      { id: 'ld7', label: "7. Thọ Xả Ly tà [Ngã mạn] Vô trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Tham", "Ngã mạn"] },
      { id: 'ld8', label: "8. Thọ Xả Ly tà [Ngã mạn] Hữu trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Tham", "Ngã mạn", "Hôn trầm", "Thụy miên"] }
    ]
  },
  {
    id: 'akusala_dosa', label: "Sân căn (2 loại)",
    options: [
      { id: 'd1', label: "1. Thọ Ưu Hợp phẫn Vô trợ", cetasikas: [...getBase("Thọ Ưu"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Sân"] },
      { id: 'd2', label: "2. Thọ Ưu Hợp phẫn Hữu trợ", cetasikas: [...getBase("Thọ Ưu"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Sân", "Hôn trầm", "Thụy miên"] }
    ]
  },
  {
    id: 'akusala_dosa_issara', label: "Sân-Tật đố (2 loại)",
    options: [
      { id: 'di1', label: "1. Thọ Ưu Hợp phẫn [Tật đố] Vô trợ", cetasikas: [...getBase("Thọ Ưu"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Sân", "Tật đố"] },
      { id: 'di2', label: "2. Thọ Ưu Hợp phẫn [Tật đố] Hữu trợ", cetasikas: [...getBase("Thọ Ưu"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Sân", "Tật đố", "Hôn trầm", "Thụy miên"] }
    ]
  },
  {
    id: 'akusala_dosa_macchariya', label: "Sân-Lẫn tiếc (2 loại)",
    options: [
      { id: 'dm1', label: "1. Thọ Ưu Hợp phẫn [Lẫn tiếc] Vô trợ", cetasikas: [...getBase("Thọ Ưu"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Sân", "Lẫn tiếc"] },
      { id: 'dm2', label: "2. Thọ Ưu Hợp phẫn [Lẫn tiếc] Hữu trợ", cetasikas: [...getBase("Thọ Ưu"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Sân", "Lẫn tiếc", "Hôn trầm", "Thụy miên"] }
    ]
  },
  {
    id: 'akusala_dosa_kukkucca', label: "Sân-Trào hối (2 loại)",
    options: [
      { id: 'dk1', label: "1. Thọ Ưu Hợp phẫn [Trào hối] Vô trợ", cetasikas: [...getBase("Thọ Ưu"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Sân", "Trào hối"] },
      { id: 'dk2', label: "2. Thọ Ưu Hợp phẫn [Trào hối] Hữu trợ", cetasikas: [...getBase("Thọ Ưu"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...akusala4, "Sân", "Trào hối", "Hôn trầm", "Thụy miên"] }
    ]
  },
  {
    id: 'akusala_moha', label: "Si căn (2 loại)",
    options: [
      { id: 'm1', label: "1. Thọ Xả Hợp hoài nghi", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Tinh tấn", ...akusala4, "Hoài nghi"] },
      { id: 'm2', label: "2. Thọ Xả Hợp trạo cử", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", ...akusala4] } 
    ]
  },
  {
    id: 'ahetuka_hasituppada', label: "Tiếu sanh (1 loại)",
    options: [
      { id: 'h1', label: "1. Tâm Tiếu sanh", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ"] }
    ]
  },
  {
    id: 'kama_kusala', label: "Đại Thiện (8 loại)",
    options: [
      { id: 'k1', label: "1. Thọ Hỷ Hợp trí Vô trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
      { id: 'k2', label: "2. Thọ Hỷ Hợp trí Hữu trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
      { id: 'k3', label: "3. Thọ Hỷ Ly trí Vô trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA] },
      { id: 'k4', label: "4. Thọ Hỷ Ly trí Hữu trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA] },
      { id: 'k5', label: "5. Thọ Xả Hợp trí Vô trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
      { id: 'k6', label: "6. Thọ Xả Hợp trí Hữu trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
      { id: 'k7', label: "7. Thọ Xả Ly trí Vô trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA] },
      { id: 'k8', label: "8. Thọ Xả Ly trí Hữu trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA] }
    ]
  },
  {
    id: 'kama_kiriya', label: "Đại Duy tác (8 loại)",
    options: [
      { id: 'ki1', label: "1. Thọ Hỷ Hợp trí Vô trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA.filter(c=>c!=="Hành xả"), "Trí tuệ"] },
      { id: 'ki2', label: "2. Thọ Hỷ Hợp trí Hữu trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA.filter(c=>c!=="Hành xả"), "Trí tuệ"] },
      { id: 'ki3', label: "3. Thọ Hỷ Ly trí Vô trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA.filter(c=>c!=="Hành xả")] },
      { id: 'ki4', label: "4. Thọ Hỷ Ly trí Hữu trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Hỷ", "Dục", ...SOBHANA_SADHARANA.filter(c=>c!=="Hành xả")] },
      { id: 'ki5', label: "5. Thọ Xả Hợp trí Vô trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA.filter(c=>c!=="Hành xả"), "Trí tuệ"] },
      { id: 'ki6', label: "6. Thọ Xả Hợp trí Hữu trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA.filter(c=>c!=="Hành xả"), "Trí tuệ"] },
      { id: 'ki7', label: "7. Thọ Xả Ly trí Vô trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA.filter(c=>c!=="Hành xả")] },
      { id: 'ki8', label: "8. Thọ Xả Ly trí Hữu trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA.filter(c=>c!=="Hành xả")] }
    ]
  },
  {
    id: 'rupa_jhana_kusala', label: "Thiện Sắc giới (5 loại)",
    options: [
      { id: 'rk1', label: "1. Sơ thiền Thiện", cetasikas: rupa1Base },
      { id: 'rk2', label: "2. Nhị thiền Thiện", cetasikas: rupa2Base },
      { id: 'rk3', label: "3. Tam thiền Thiện", cetasikas: rupa3Base },
      { id: 'rk4', label: "4. Tứ thiền Thiện", cetasikas: rupa4Base },
      { id: 'rk5', label: "5. Ngũ thiền Thiện", cetasikas: rupa5Base }
    ]
  },
  {
    id: 'rupa_jhana_kiriya', label: "Duy tác Sắc giới (5 loại)",
    options: [
      { id: 'rki1', label: "1. Sơ thiền Duy tác", cetasikas: rupa1Base },
      { id: 'rki2', label: "2. Nhị thiền Duy tác", cetasikas: rupa2Base },
      { id: 'rki3', label: "3. Tam thiền Duy tác", cetasikas: rupa3Base },
      { id: 'rki4', label: "4. Tứ thiền Duy tác", cetasikas: rupa4Base },
      { id: 'rki5', label: "5. Ngũ thiền Duy tác", cetasikas: rupa5Base }
    ]
  },
  {
    id: 'arupa_jhana_kusala', label: "Thiện Vô Sắc giới (4 loại)",
    options: [
      { id: 'ark1', label: "1. Không vô biên xứ Thiện", cetasikas: arupaBase },
      { id: 'ark2', label: "2. Thức vô biên xứ Thiện", cetasikas: arupaBase },
      { id: 'ark3', label: "3. Vô sở hữu xứ Thiện", cetasikas: arupaBase },
      { id: 'ark4', label: "4. Phi tưởng phi phi tưởng xứ Thiện", cetasikas: arupaBase }
    ]
  },
  {
    id: 'arupa_jhana_kiriya', label: "Duy tác Vô Sắc giới (4 loại)",
    options: [
      { id: 'arki1', label: "1. Không vô biên xứ Duy tác", cetasikas: arupaBase },
      { id: 'arki2', label: "2. Thức vô biên xứ Duy tác", cetasikas: arupaBase },
      { id: 'arki3', label: "3. Vô sở hữu xứ Duy tác", cetasikas: arupaBase },
      { id: 'arki4', label: "4. Phi tưởng phi phi tưởng xứ Duy tác", cetasikas: arupaBase }
    ]
  },
  {
    id: 'magga_1', label: "1. Tu Đà Hoàn Đạo",
    options: [{ id: 'lm1', label: "Tu Đà Hoàn Đạo", cetasikas: [] }]
  },
  {
    id: 'magga_2', label: "2. Tư Đà Hàm Đạo",
    options: [{ id: 'lm2', label: "Tư Đà Hàm Đạo", cetasikas: [] }]
  },
  {
    id: 'magga_3', label: "3. A Na Hàm Đạo",
    options: [{ id: 'lm3', label: "A Na Hàm Đạo", cetasikas: [] }]
  },
  {
    id: 'magga_4', label: "4. A La Hán Đạo",
    options: [{ id: 'lm4', label: "A La Hán Đạo", cetasikas: [] }]
  },
  {
    id: 'phala_1', label: "1. Tu Đà Hoàn Quả",
    options: [{ id: 'lp1', label: "Tu Đà Hoàn Quả", cetasikas: [] }]
  },
  {
    id: 'phala_2', label: "2. Tư Đà Hàm Quả",
    options: [{ id: 'lp2', label: "Tư Đà Hàm Quả", cetasikas: [] }]
  },
  {
    id: 'phala_3', label: "3. A Na Hàm Quả",
    options: [{ id: 'lp3', label: "A Na Hàm Quả", cetasikas: [] }]
  },
  {
    id: 'phala_4', label: "4. A La Hán Quả",
    options: [{ id: 'lp4', label: "A La Hán Quả", cetasikas: [] }]
  },
  {
    id: 'nirodha_3', label: "Bậc A na hàm (Nhập Diệt tận định)",
    options: [{ id: 'np3', label: "A Na Hàm Quả", cetasikas: [] }]
  },
  {
    id: 'nirodha_4', label: "Bậc A la hán (Nhập Diệt tận định)",
    options: [{ id: 'np4', label: "A La Hán Quả", cetasikas: [] }]
  },
  {
    id: 'abhinna_kusala', label: "Ngũ thiền Sắc giới Thiện (Thần thông)",
    options: [
      { id: 'abk', label: "Ngũ thiền Sắc giới Thiện", cetasikas: rupa5Base }
    ]
  },
  {
    id: 'abhinna_kiriya', label: "Ngũ thiền Sắc giới Duy tác (Thần thông)",
    options: [
      { id: 'abki', label: "Ngũ thiền Sắc giới Duy tác", cetasikas: rupa5Base }
    ]
  }
];

const Ahetuka_Vipaka = [
  { id: 'av1', label: "1. Thọ Xả Quan sát (Bất thiện quả)", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải"] },
  { id: 'av2', label: "2. Thọ Xả Quan sát (Thiện quả)", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải"] },
  { id: 'av3', label: "3. Thọ Hỷ Quan sát (Thiện quả)", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Hỷ"] }
];

const Maha_Vipaka = [
  { id: 'v1', label: "1. Thọ Hỷ Hợp trí Vô trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Hỷ", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'v2', label: "2. Thọ Hỷ Hợp trí Hữu trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Hỷ", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'v3', label: "3. Thọ Hỷ Ly trí Vô trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Hỷ", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA] },
  { id: 'v4', label: "4. Thọ Hỷ Ly trí Hữu trợ", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Hỷ", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA] },
  { id: 'v5', label: "5. Thọ Xả Hợp trí Vô trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'v6', label: "6. Thọ Xả Hợp trí Hữu trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'v7', label: "7. Thọ Xả Ly trí Vô trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA] },
  { id: 'v8', label: "8. Thọ Xả Ly trí Hữu trợ", cetasikas: [...getBase("Thọ Xả"), "Tầm", "Tứ", "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA] },
];

const Mahaggata_Vipaka = [
  { id: 'rv1', label: "1. Sơ thiền Quả", cetasikas: [...getBase("Thọ Hỷ"), "Tầm", "Tứ", "Thắng giải", "Hỷ", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'rv2', label: "2. Nhị thiền Quả", cetasikas: [...getBase("Thọ Hỷ"), "Tứ", "Thắng giải", "Hỷ", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'rv3', label: "3. Tam thiền Quả", cetasikas: [...getBase("Thọ Hỷ"), "Thắng giải", "Hỷ", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'rv4', label: "4. Tứ thiền Quả", cetasikas: [...getBase("Thọ Hỷ"), "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'rv5', label: "5. Ngũ thiền Quả", cetasikas: [...getBase("Thọ Xả"), "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'arv1', label: "6. Không vô biên xứ Quả", cetasikas: [...getBase("Thọ Xả"), "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'arv2', label: "7. Thức vô biên xứ Quả", cetasikas: [...getBase("Thọ Xả"), "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'arv3', label: "8. Vô sở hữu xứ Quả", cetasikas: [...getBase("Thọ Xả"), "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
  { id: 'arv4', label: "9. Phi tưởng phi phi tưởng xứ Quả", cetasikas: [...getBase("Thọ Xả"), "Thắng giải", "Tinh tấn", "Dục", ...SOBHANA_SADHARANA, "Trí tuệ"] },
];

const VIPAKA_GROUPS = [
  { id: 'ahetuka_vipaka', label: 'Vô nhân quả (2 loại)', colorClass: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100', options: Ahetuka_Vipaka.slice(0, 2) },
  { id: 'maha_vipaka', label: 'Đại quả (8 loại)', colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100', options: Maha_Vipaka },
  { id: 'rupa_vipaka', label: 'Sắc giới quả (5 loại)', colorClass: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100', options: Mahaggata_Vipaka.slice(0, 5) },
  { id: 'arupa_vipaka', label: 'Vô sắc giới quả (4 loại)', colorClass: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100', options: Mahaggata_Vipaka.slice(5, 9) }
];

// --- PUGGALA DEFINITIONS ---
const PUGGALA_LIST = [
  {
    group: "Cõi khổ (Ác thú)", colorClass: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100',
    options: [
      { id: 'duggati', label: "Người vô nhân cõi khổ" }
    ]
  },
  {
    group: "Cõi dục thiện thú", colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    options: [
      { id: 'sugati_ahetuka', label: "Người vô nhân cõi thiện thú" },
      { id: 'dvihetuka', label: "Người nhị nhân" },
      { id: 'tihetuka_kama', label: "Phàm phu tam nhân" },
      { id: 'sotapanna_kama', label: "Tu đà hoàn/Tư đà hàm" },
      { id: 'anagami_kama', label: "A na hàm" },
      { id: 'arahant_kama', label: "A la hán" }
    ]
  },
  {
    group: "Cõi Sắc giới", colorClass: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
    options: [
      { id: 'tihetuka_rupa', label: "Phàm phu tam nhân cõi Sắc" },
      { id: 'sotapanna_rupa', label: "Tu đà hoàn/Tư đà hàm cõi Sắc" },
      { id: 'anagami_rupa', label: "A na hàm cõi Sắc" },
      { id: 'arahant_rupa', label: "A la hán cõi Sắc" }
    ]
  },
  {
    group: "Cõi Vô sắc giới", colorClass: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100',
    options: [
      { id: 'tihetuka_arupa', label: "Phàm phu tam nhân cõi Vô sắc" },
      { id: 'sotapanna_arupa', label: "Tu đà hoàn/Tư đà hàm cõi Vô sắc" },
      { id: 'anagami_arupa', label: "A na hàm cõi Vô sắc" },
      { id: 'arahant_arupa', label: "A la hán cõi Vô sắc" }
    ]
  }
];

const getDefaultBhavanga = (puggalaId) => {
    if (puggalaId === 'duggati') return 'av1';
    if (puggalaId === 'sugati_ahetuka') return 'av2';
    if (puggalaId === 'dvihetuka') return 'v3';
    if (puggalaId.includes('kama')) return 'v1';
    if (puggalaId.includes('rupa') && !puggalaId.includes('arupa')) return 'rv1';
    if (puggalaId.includes('arupa')) return 'arv1';
    return 'v1';
};

const getPuggalaFromBhavanga = (bhavangaId) => {
    if (bhavangaId === 'av1') return 'duggati';
    if (bhavangaId === 'av2') return 'sugati_ahetuka';
    if (['v3', 'v4', 'v7', 'v8'].includes(bhavangaId)) return 'dvihetuka';
    if (['v1', 'v2', 'v5', 'v6'].includes(bhavangaId)) return 'tihetuka_kama';
    if (bhavangaId.startsWith('rv')) return 'tihetuka_rupa';
    if (bhavangaId.startsWith('arv')) return 'tihetuka_arupa';
    return 'tihetuka_kama';
};

const getAvailableVithis = (puggalaId) => {
    let vithis = [
      { group: "Ngũ môn lộ tâm", options: [{ id: 'cakkhu', label: "Nhãn môn lộ tâm" }, { id: 'sota', label: "Nhĩ môn lộ tâm" }, { id: 'ghana', label: "Tỷ môn lộ tâm" }, { id: 'jivha', label: "Thiệt môn lộ tâm" }, { id: 'kaya', label: "Thân môn lộ tâm" }] },
      { group: "Ý môn lộ tâm", options: [{ id: 'mano_kama', label: "Ý môn Dục tốc" }, { id: 'appana_jhana_1', label: "Sơ đắc Thiền lộ" }, { id: 'appana_jhana_later', label: "Nhập Thiền" }, { id: 'appana_abhinna', label: "Thần thông" }, { id: 'appana_magga', label: "Lộ Đạo" }, { id: 'appana_phala', label: "Nhập Quả" }, { id: 'appana_nirodha', label: "Diệt tận định" }, { id: 'appana_adhit', label: "Lộ Phát nguyện (Đức Phật)" }] }
    ]; 
    
    if (['duggati', 'sugati_ahetuka', 'dvihetuka'].includes(puggalaId)) {
        const manoGroup = vithis.find(g => g.group === "Ý môn lộ tâm");
        if (manoGroup) manoGroup.options = manoGroup.options.filter(o => o.id === 'mano_kama');
    }
    if (puggalaId.includes('rupa') && !puggalaId.includes('arupa')) {
        const pancaGroup = vithis.find(g => g.group === "Ngũ môn lộ tâm");
        if (pancaGroup) pancaGroup.options = pancaGroup.options.filter(o => o.id === 'cakkhu' || o.id === 'sota');
    }
    if (puggalaId.includes('arupa')) {
        vithis = vithis.filter(g => g.group !== "Ngũ môn lộ tâm");
    }
    
    const manoGroup = vithis.find(g => g.group === "Ý môn lộ tâm");
    if (manoGroup) {
        if (puggalaId.includes('tihetuka')) {
            manoGroup.options = manoGroup.options.filter(o => !['appana_phala', 'appana_nirodha', 'appana_adhit'].includes(o.id));
        }
        if (puggalaId === 'tihetuka_arupa') {
            manoGroup.options = manoGroup.options.filter(o => o.id !== 'appana_magga');
        }
        if (puggalaId.includes('sotapanna')) {
            manoGroup.options = manoGroup.options.filter(o => !['appana_nirodha', 'appana_adhit'].includes(o.id));
        }
        if (puggalaId.includes('anagami')) {
            manoGroup.options = manoGroup.options.filter(o => o.id !== 'appana_adhit');
        }
        if (!puggalaId.includes('arahant')) {
            manoGroup.options = manoGroup.options.filter(o => o.id !== 'appana_adhit');
        }
    }
    
    return vithis.filter(g => g.options && g.options.length > 0);
};

const getAvailableJavanaGroupsRaw = (vithi, puggalaId) => {
    let groups = [];
    if (['cakkhu', 'sota', 'ghana', 'jivha', 'kaya', 'mano_kama'].includes(vithi)) {
        groups = JAVANA_GROUPS.filter(g => g.id.startsWith('akusala') || g.id === 'ahetuka_hasituppada' || g.id.startsWith('kama_'));
    } else if (['appana_jhana_1', 'appana_jhana_later'].includes(vithi)) {
        groups = JAVANA_GROUPS.filter(g => g.id.startsWith('rupa_') || g.id.startsWith('arupa_'));
    } else if (vithi === 'appana_abhinna') {
        groups = JAVANA_GROUPS.filter(g => g.id.startsWith('abhinna_'));
    } else if (vithi === 'appana_magga') {
        groups = JAVANA_GROUPS.filter(g => g.id.startsWith('magga_'));
    } else if (vithi === 'appana_phala') {
        groups = JAVANA_GROUPS.filter(g => g.id.startsWith('phala_'));
    } else if (vithi === 'appana_nirodha') {
        groups = JAVANA_GROUPS.filter(g => g.id.startsWith('nirodha_'));
    } else if (vithi === 'appana_adhit') {
        groups = JAVANA_GROUPS.filter(g => g.id === 'kama_kiriya');
    } else {
        groups = JAVANA_GROUPS;
    }

    if (['duggati', 'sugati_ahetuka', 'dvihetuka'].includes(puggalaId)) {
        groups = groups.filter(g => g.id !== 'ahetuka_hasituppada' && !g.id.includes('kiriya') && !g.id.startsWith('magga_') && !g.id.startsWith('phala_'));
    }

    return groups;
};

const getFilteredJavanaOptions = (groupId, puggalaId) => {
    const group = JAVANA_GROUPS.find(g => g.id === groupId);
    if (!group) return [];
    let opts = group.options;

    const isArahant = puggalaId.includes('arahant');
    const isAnagami = puggalaId.includes('anagami');
    const isSotapanna = puggalaId.includes('sotapanna');
    const isSekha = isSotapanna || isAnagami;
    
    if (isArahant) {
        if (groupId.includes('akusala') || groupId.includes('kusala')) return [];
        if (groupId.startsWith('magga_') && groupId !== 'magga_4') return [];
        if (groupId.startsWith('phala_') && groupId !== 'phala_4') return [];
        if (groupId.startsWith('nirodha_') && groupId !== 'nirodha_4') return [];
    } else {
        if (groupId.includes('kiriya') || groupId === 'ahetuka_hasituppada') return [];
        
        if (groupId.startsWith('nirodha_') && !isAnagami) return [];
        if (groupId.startsWith('nirodha_') && isAnagami && groupId !== 'nirodha_3') return [];

        if (groupId.startsWith('phala_')) {
            if (isSotapanna && !['phala_1', 'phala_2'].includes(groupId)) return []; 
            if (isAnagami && groupId !== 'phala_3') return [];
            if (!isSekha && !isArahant) return [];
        }

        if (groupId.startsWith('magga_')) {
            if (puggalaId === 'tihetuka_arupa') return [];
            if (isAnagami && !['magga_3', 'magga_4'].includes(groupId)) return [];
        }
    }

    if (isSekha || isArahant) {
        if (groupId === 'akusala_lobha') opts = opts.filter(o => !['ld1', 'ld2', 'ld5', 'ld6'].includes(o.id));
        if (groupId === 'akusala_moha') opts = opts.filter(o => o.id !== 'm1');
    }

    if (isAnagami || isArahant || puggalaId.includes('rupa') || puggalaId.includes('arupa')) {
        if (groupId.includes('dosa')) return [];
    }
    
    if (puggalaId.includes('arupa')) {
        if (groupId.includes('rupa_jhana') || groupId.includes('abhinna')) return [];
    }

    return opts;
};

const getAvailableTadarammanas = (jVedana, aramQ, puggalaId) => {
    let opts = [];
    if (aramQ === 3) {
        opts = [Ahetuka_Vipaka[0]]; 
    } else if (aramQ === 0) { 
        if (jVedana === 'D' || jVedana === 'U') opts = []; 
        else opts = [Ahetuka_Vipaka[2], ...Maha_Vipaka.slice(0, 4)]; 
    } else {
        opts = [Ahetuka_Vipaka[1], ...Maha_Vipaka.slice(4, 8)]; 
    }

    if (puggalaId === 'duggati') {
        opts = opts.filter(o => o.id.startsWith('av'));
    } else if (puggalaId === 'sugati_ahetuka' || puggalaId === 'dvihetuka') {
        opts = opts.filter(o => o.id.startsWith('av') || ['v3', 'v4', 'v7', 'v8'].includes(o.id));
    } else if (puggalaId.includes('rupa') || puggalaId.includes('arupa')) {
        opts = [];
    }
    return opts;
};

const ARAM_Q_LABELS = ["Cảnh Rất Lớn", "Cảnh Lớn", "Cảnh Trung Bình", "Cảnh Xấu (Bất thiện quả)"];

const RUPA_ARAMMANA_OPTIONS = [
  "Tướng tùy quang của 10 Kasina",
  "Tướng tùy quang của Đề mục Xương",
  "Tướng tùy quang của Đề mục Hơi thở",
  "Tướng tùy quang của Đề mục Tử thi",
  "Khái niệm Chúng sanh (Từ, Bi, Hỷ)",
  "Khái niệm Chúng sanh (Xả Vô lượng tâm)"
];

const ARUPA_ARAMMANA_OPTIONS = [
  "Khái niệm Hư không gỡ ra từ Kasina",
  "Không vô biên xứ Thức",
  "Khái niệm Không vô biên xứ Thức không còn tồn tại",
  "Vô sở hữu xứ Thức"
];

// Returns which Jhana indices (0=1st, 1=2nd, 2=3rd, 3=4th, 4=5th) are valid for a selected Rupa Arammana
const getValidJhanaIndices = (aramIdx) => {
    if (aramIdx === 1 || aramIdx === 3) return [0]; // 1st Jhana only
    if (aramIdx === 4) return [0, 1, 2, 3]; // up to 4th Jhana
    if (aramIdx === 5) return [4]; // 5th Jhana only
    return [0, 1, 2, 3, 4]; // All
};

const PANCADVARA_INFO = {
  cakkhu: { viññāṇa: "Nhãn thức", vīthi: "Nhãn môn lộ tâm", ārammaṇa: "Cảnh Sắc hiện tại", base: "Nhãn căn-63", vedanā: "Thọ Xả" },
  sota: { viññāṇa: "Nhĩ thức", vīthi: "Nhĩ môn lộ tâm", ārammaṇa: "Cảnh Thinh hiện tại", base: "Nhĩ căn-63", vedanā: "Thọ Xả" },
  ghana: { viññāṇa: "Tỷ thức", vīthi: "Tỷ môn lộ tâm", ārammaṇa: "Cảnh Khí hiện tại", base: "Tỷ căn-63", vedanā: "Thọ Xả" },
  jivha: { viññāṇa: "Thiệt thức", vīthi: "Thiệt môn lộ tâm", ārammaṇa: "Cảnh Vị hiện tại", base: "Thiệt căn-63", vedanā: "Thọ Xả" },
  kaya: { viññāṇa: "Thân thức", vīthi: "Thân môn lộ tâm", ārammaṇa: "Cảnh Xúc hiện tại", base: "Thân căn-53", vedanā: "Thọ Lạc" }
};

const KAYA_ARAMMANA_OPTIONS = ["Cảnh Xúc hiện tại (Đất)", "Cảnh Xúc hiện tại (Lửa)", "Cảnh Xúc hiện tại (Gió)"];

const DHAMMARAMMANA_RUPA = [
  { group: "Sắc chân đế (11 loại)", options: [ "Thần kinh nhãn", "Thần kinh nhĩ", "Thần kinh tỷ", "Thần kinh thiệt", "Thần kinh thân", "Nước", "Tính Nữ", "Tính Nam", "Ý căn", "Mạng căn", "Dưỡng tố" ]},
  { group: "Sắc chế định (10 loại)", options: [ "Hư không", "Thân biểu tri", "Khẩu biểu tri", "Sắc khinh", "Sắc nhu", "Sắc thích", "Sắc sinh", "Sắc tiến", "Sắc dị", "Sắc diệt" ]},
  { group: "Cảnh Giới giới (3 loại)", options: ["Đối tượng của Chánh ngữ", "Đối tượng của Chánh nghiệp", "Đối tượng của Chánh mạng"] },
  { group: "Cảnh Vô lượng tâm (2 loại)", options: ["Đối tượng của Bi (Chúng sanh khổ)", "Đối tượng của Hỷ (Chúng sanh hạnh phúc)"] }
];

const PHASES = [
  { id: 'patisandhi', label: 'Kiết sanh' },
  { id: 'pavatti', label: 'Bình nhật' },
  { id: 'cuti', label: 'Tử tâm' }
];
const VIPAKA_LABEL_MAP = {
  'Kiết sanh':'Tâm Kiết sanh', 'Hữu phần':'Tâm Hữu phần', 'Tử tâm':'Tâm Tử',
  'Tiếp thâu':'Tâm Tiếp thâu', 'Quan sát':'Tâm Quan sát', 'Đồng sở duyên':'Tâm Đồng sở duyên',
};

const PD_LABELS = [
  "Cảnh Rất Lớn (Na cảnh)", "Cảnh Lớn 1 (Đổng tốc)", "Cảnh Lớn 2 (Đổng tốc)", "Cảnh Nhỏ 1 (Phân đoán)", "Cảnh Nhỏ 2", "Cảnh Nhỏ 3", "Cảnh Nhỏ 4", "Cảnh Nhỏ 5", "Cảnh Nhỏ 6", "Cảnh Rất Nhỏ 1 (Khách trần)", "Cảnh Rất Nhỏ 2", "Cảnh Rất Nhỏ 3", "Cảnh Rất Nhỏ 4", "Cảnh Rất Nhỏ 5", "Cảnh Rất Nhỏ 6"
];

const MK_LABELS = ["Cảnh Rất Rõ (Na cảnh)", "Cảnh Rõ (Đổng tốc)", "Cảnh Mờ (Vô đổng tốc)", "Cảnh Rất Mờ (Khách trần)"];
const AP_LABELS = ["Độn trí (Có Chuẩn bị)", "Lợi trí (Không Chuẩn bị)"];

const getAyatanaAramLabel = (t) => {
  if (!t) return "Pháp xứ";
  if (t.includes("Cảnh sắc")) return "Sắc xứ";
  if (t.includes("Cảnh thinh")) return "Thinh xứ";
  if (t.includes("Cảnh hương")) return "Khí xứ";
  if (t.includes("Cảnh vị")) return "Vị xứ";
  if (t.includes("Cảnh xúc")) return "Xúc xứ";
  return "Pháp xứ";
};
const getAyatanaBaseLabel = (t) => {
  if (!t) return "Pháp xứ";
  if (t.includes("Nhãn căn")) return "Nhãn xứ";
  if (t.includes("Nhĩ căn")) return "Nhĩ xứ";
  if (t.includes("Tỷ căn")) return "Tỷ xứ";
  if (t.includes("Thiệt căn")) return "Thiệt xứ";
  if (t.includes("Thân căn")) return "Thân xứ";
  return "Pháp xứ";
};
const getDhatuVinnanaLabel = (name) => {
  if (!name) return "Ý thức giới";
  if (name.includes("Nhãn thức")) return "Nhãn thức giới";
  if (name.includes("Nhĩ thức")) return "Nhĩ thức giới";
  if (name.includes("Tỷ thức")) return "Tỷ thức giới";
  if (name.includes("Thiệt thức")) return "Thiệt thức giới";
  if (name.includes("Thân thức")) return "Thân thức giới";
  if (name.includes("hướng tâm") || name.includes("Tiếp thâu")) return "Ý giới";
  return "Ý thức giới";
};
const getDhatuAramLabel = (t) => {
  if (!t) return "Pháp giới";
  if (t.includes("Cảnh sắc")) return "Sắc giới";
  if (t.includes("Cảnh thinh")) return "Thinh giới";
  if (t.includes("Cảnh hương")) return "Khí giới";
  if (t.includes("Cảnh vị")) return "Vị giới";
  if (t.includes("Cảnh xúc")) return "Xúc giới";
  return "Pháp giới";
};
const getDhatuBaseLabel = (t) => {
  if (!t) return "Pháp giới";
  if (t.includes("Nhãn căn")) return "Nhãn giới";
  if (t.includes("Nhĩ căn")) return "Nhĩ giới";
  if (t.includes("Tỷ căn")) return "Tỷ giới";
  if (t.includes("Thiệt căn")) return "Thiệt giới";
  if (t.includes("Thân căn")) return "Thân giới";
  return "Pháp giới";
};
export default function App({ initialPage = null, onPageChange = null } = {}) {
  const [showNidanaMenu, setShowNidanaMenu] = useState(false);
  const [selectedNidana, setSelectedNidana] = useState(null);
const [nidanaViewMode, setNidanaViewMode] = useState('cause'); // 'cause' | 'effect'
const [nidanaCycleIndex, setNidanaCycleIndex] = useState(0);
const [nidana2SubMode, setNidana2SubMode] = useState(null);
const [nidana3SubMode, setNidana3SubMode] = useState(null);
const [nidana4CycleIdx, setNidana4CycleIdx] = useState(0);
const [nidana5SubMode, setNidana5SubMode] = useState('cause');
const [nidana10EffectIdx, setNidana10EffectIdx] = useState(0);
const [showAyatanaDetail, setShowAyatanaDetail] = useState(false);
const [rupaRupaAyState, setRupaRupaAyState] = useState({ causeIdx: 0, effectIdx: 0 });
  const [displayMode, setDisplayMode] = useState('rupa-nama');
  const [khandhaViewIndex, setKhandhaViewIndex] = useState(0); 
  const NIDANA_LIST = [
  "Vô minh duyên Hành (Avijjāpaccayā saṅkhārā)",
  "Hành duyên Thức (Saṅkhārapaccayā viññāṇaṃ)",
  "Thức duyên Danh Sắc (Viññāṇapaccayā nāmarūpaṃ)",
  "Danh Sắc duyên Lục nhập (Nāmarūpapaccayā saḷāyatanaṃ)",
  "Lục nhập duyên Xúc (Saḷāyatanapaccayā phasso)",
  "Xúc duyên Thọ (Phassapaccayā vedanā)",
  "Thọ duyên Ái (Vedanāpaccayā taṇhā)",
  "Ái duyên Thủ (Taṇhāpaccayā upādānaṃ)",
  "Thủ duyên Hữu (Upādānapaccayā bhavo)",
  "Hữu duyên Sanh (Bhavapaccayā jāti)",
  "Sanh duyên Lão tử.. (Jātipaccayā jarāmaraṇaṃ..)",
  ];

  const [currentLifeOffset, setCurrentLifeOffset] = useState(() => initialPage?.currentLifeOffset ?? 0);
  const [activePhase, setActivePhase] = useState(() => initialPage?.activePhase ?? 'patisandhi');

  const [puggalaByLife, setPuggalaByLife] = useState(() => initialPage?.puggalaByLife ?? { 0: 'tihetuka_kama' });
  const [lifeLocks, setLifeLocks] = useState({ 0: false });
  const [isBhavangaAuto, setIsBhavangaAuto] = useState(true);

  const activePuggalaId = puggalaByLife[currentLifeOffset] || 'tihetuka_kama';
  const isLifeLocked = lifeLocks[currentLifeOffset] || false;

  const [showPuggalaMenu, setShowPuggalaMenu] = useState(false);
  const [expandedPuggalaGroup, setExpandedPuggalaGroup] = useState(null);

  const [showBhavangaMenu, setShowBhavangaMenu] = useState(false);
  const [expandedBhavangaGroup, setExpandedBhavangaGroup] = useState(null);

  const [activeVithi, setActiveVithi] = useState(() => initialPage?.activeVithi ?? 'cakkhu');
  const [javanaGroupId, setJavanaGroupId] = useState(() => initialPage?.javanaGroupId ?? 'akusala_lobha');
  const [javanaSubIndex, setJavanaSubIndex] = useState(0);
  const [lokuttaraJhanaIndex, setLokuttaraJhanaIndex] = useState(0);
  const [rupaArammanaIndex, setRupaArammanaIndex] = useState(0);

  const [bhavangaGroupId, setBhavangaGroupId] = useState(() => initialPage?.bhavangaGroupId ?? 'maha_vipaka');
  const [bhavangaSubIndex, setBhavangaSubIndex] = useState(0);

  // Reports the current top-level "page" (phase/vithi/javana-group/bhavanga-group/
  // life-offset/puggala-by-life) up to the language-switcher wrapper so it can be
  // fed back in as `initialPage` if the user switches language and lands back on
  // this same component (or the other language's sibling, seeded with these
  // language-neutral ids). See src/VithiCittaApp.jsx.
  useEffect(() => {
    onPageChange?.({ activePhase, activeVithi, javanaGroupId, bhavangaGroupId, currentLifeOffset, puggalaByLife });
  }, [activePhase, activeVithi, javanaGroupId, bhavangaGroupId, currentLifeOffset, puggalaByLife]);
  
  const [selectedArammana, setSelectedArammana] = useState(DHAMMARAMMANA_RUPA[0].options[0]);
  const [kayaArammanaIndex, setKayaArammanaIndex] = useState(0);
  
  const [pancaDvaraVariation, setPancaDvaraVariation] = useState(0);
  const [manoKamaVariation, setManoKamaVariation] = useState(0);
  const [appanaVariation, setAppanaVariation] = useState(0);
  const [cutiVariation, setCutiVariation] = useState(0); 
  const [nidana10BaseOffset, setNidana10BaseOffset] = useState(0);
  const [pastCutiVariation, setPastCutiVariation] = useState(0);

  const [aramQIndex, setAramQIndex] = useState(0);
  const [tadaCycleIndex, setTadaCycleIndex] = useState(0);
  
  const [paticcaStep, setPaticcaStep] = useState(0);
  const [paticcaCittaName, setPaticcaCittaName] = useState("");
const [paticcaKhandha, setPaticcaKhandha] = useState(0);
const [paticcaLockedNodeData, setPaticcaLockedNodeData] = useState(null);
const [paticcaOriginalNodeData, setPaticcaOriginalNodeData] = useState(null);
const [sankharaOnlyCetana, setSankharaOnlyCetana] = useState(false);
  const [paticcaSavedState, setPaticcaSavedState] = useState(null);

  const [customArammanas, setCustomArammanas] = useState({
      past_life: "Nghiệp/Tướng nghiệp/Tướng thú quá khứ",
      present_life: "Nghiệp/Tướng nghiệp/Tướng thú hiện tại",
      future_life: "Nghiệp/Tướng nghiệp/Tướng thú tương lai"
  });

  const [avijjaStateByLife, setAvijjaStateByLife] = useState({});
  const [sankharaStateByLife, setSankharaStateByLife] = useState({});
  const getAvijjaState = (offset) => avijjaStateByLife[offset] || { vara: 0, javanaIdx: 0, tadaIdx: 0 };
  const getSankharaState = (offset) => sankharaStateByLife[offset] || { vara: 0, javanaGroupId: 'kama_kusala', javanaIdx: 0, tadaIdx: 0, aramQIndex: 0 };
const avijjaState = getAvijjaState(currentLifeOffset - 1);
const sankharaState = getSankharaState(currentLifeOffset - 1);
  const availableVithis = useMemo(() => getAvailableVithis(activePuggalaId), [activePuggalaId]);
  
  const availableJavanaGroups = useMemo(() => {
      let groups = getAvailableJavanaGroupsRaw(activeVithi, activePuggalaId);
      groups = groups.map(g => {
          const filteredOpts = getFilteredJavanaOptions(g.id, activePuggalaId);
          return { ...g, options: filteredOpts };
      }).filter(g => g.options && g.options.length > 0);
      return groups;
  }, [activeVithi, activePuggalaId]);

  const currentBhavangaGroup = VIPAKA_GROUPS.find(g => g.id === bhavangaGroupId) || VIPAKA_GROUPS[1];

  useEffect(() => {
      const validVithiIds = availableVithis.flatMap(g => g.options.map(o => o.id));
      if (!validVithiIds.includes(activeVithi)) {
          setActiveVithi(validVithiIds.includes('mano_kama') ? 'mano_kama' : validVithiIds[0] || 'cakkhu');
          setCurrentIndex(0);
          setIsPlaying(false);
          setPancaDvaraVariation(0);
          setManoKamaVariation(0);
          setAppanaVariation(0);
      }
  }, [availableVithis, activeVithi]);

  useEffect(() => {
      const validJavanaGroupIds = availableJavanaGroups.map(g => g.id);
      if (validJavanaGroupIds.length > 0 && !validJavanaGroupIds.includes(javanaGroupId)) {
          setJavanaGroupId(validJavanaGroupIds[0]);
          setJavanaSubIndex(0);
          setLokuttaraJhanaIndex(0);
      }
  }, [availableJavanaGroups, javanaGroupId]);

  const toggleLifeLock = (offset) => {
      setLifeLocks(prev => ({ ...prev, [offset]: !prev[offset] }));
  };

  const handlePuggalaChange = (newPuggId) => {
      if (isLifeLocked) return;
      setPuggalaByLife(prev => ({ ...prev, [currentLifeOffset]: newPuggId }));
      if (isBhavangaAuto) {
          const bhv = getDefaultBhavanga(newPuggId);
          setBhavangaById(bhv);
      }
      setCurrentIndex(0);
      setIsPlaying(false);
  };

  const handlePaticcaToggle = () => {
      const isViññana = khandhaViewIndex === 5;
      const vipakaKeywords = ["Quả", "Kiết sanh", "Hữu phần", "Tử tâm", "Tiếp thâu", "Quan sát", "Đồng sở duyên",
        "Nhãn thức","Nhĩ thức","Tỷ thức","Thiệt thức","Thân thức"];
      const currentNodeName = paticcaStep === 0 ? activeNode.name : (paticcaLockedNodeData?.name || activeNode.name);
      const isVedana = khandhaViewIndex === 2;
      const isSanna = khandhaViewIndex === 3;
      const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
      const isNamaKhandha = isVedana || isSanna || isSankhara;
      const lockedOrActive = paticcaStep === 0 ? activeNode : (paticcaLockedNodeData || activeNode);
      
      const hasBhavangaSamphassa = lockedOrActive?.vithi?.includes("Ý môn") ||
    lockedOrActive?.name?.includes("Ngũ môn hướng tâm");
              
      const isVipakaCheck = (isViññana || isNamaKhandha) && vipakaKeywords.some(k => currentNodeName.includes(k));
      const isPancaVinnana = ["Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức"].some(v => currentNodeName.includes(v));

      const hasManasikara = 
    isPancaVinnana ||
    currentNodeName.includes("Đổng tốc") ||
    currentNodeName.includes("Đạo") ||
    currentNodeName.includes("Quả") ||
    currentNodeName.includes("Thiền") ||
    currentNodeName.includes("Tiếu sanh") ||
    currentNodeName.includes("Duy tác") ||
    currentNodeName === "Chuẩn bị" ||
    currentNodeName === "Cận hành" ||
    currentNodeName === "Thuận thứ" ||
    currentNodeName === "Chuyển tộc" ||
    currentNodeName === "Tịnh diệu" ||
    currentNodeName === "Thần thông" ||
    currentNodeName.includes("Phi tưởng phi phi tưởng") ||
    (lockedOrActive?.vithi?.includes("An chỉ") && 
     !currentNodeName.includes("Ý môn hướng tâm"));
      const activeIdx = paticcaSavedState?.index ?? currentIndex;
      const prevNode = vithiData[activeIdx - 1];
      const isUpacaraAfterMano = currentNodeName.includes("Cận hành") && prevNode?.name.includes("Ý môn hướng tâm");
      
      const isBhavangaOrVithimutta = 
    currentNodeName === "Hữu phần" ||
    currentNodeName === "Hữu phần rúng động" ||
    currentNodeName === "Hữu phần dứt dòng" ||
    currentNodeName === "Hữu phần vừa qua" ||
    currentNodeName === "Tử tâm" ||
    currentNodeName === "Kiết sanh";

const hasPreSamphassa = (isNamaKhandha || isViññana) && (
    isBhavangaOrVithimutta ||
    (!isPancaVinnana &&
     !currentNodeName.includes("Ngũ môn hướng tâm") &&
     !currentNodeName.includes("Ý môn hướng tâm") &&
     !currentNodeName.includes("Tiếp thâu") &&
     !currentNodeName.includes("Chuẩn bị") &&
     !isUpacaraAfterMano &&
     !/^1\s*-\s*Đổng tốc/.test(currentNodeName))
);

      const isPancaDvara = ['cakkhu', 'sota', 'ghana', 'jivha', 'kaya'].includes(activeVithi);
      const isSamphassaTarget =
          ["Tiếp thâu", "Quan sát"].some(v => currentNodeName.includes(v)) ||
          (["Phân đoán", "Đổng tốc", "Đồng sở duyên"].some(v => currentNodeName.includes(v)) && isPancaDvara);

      let nextStep = paticcaStep + 1;
      
      if ((isNamaKhandha || isViññana) && !isVipakaCheck && paticcaStep === 0) {
          nextStep = 3;
      } else if (isViññana || isNamaKhandha) {
          const possibleSteps = [];
          if (isVipakaCheck) {
              possibleSteps.push(1, 2);
          }
          if (isViññana) {
              possibleSteps.push(3);
              const _cn = paticcaStep === 0 ? activeNode.name : (paticcaLockedNodeData?.name || activeNode.name);
              if (["Nhãn thức","Nhĩ thức","Tỷ thức","Thiệt thức","Thân thức"].some(v => _cn.includes(v))) possibleSteps.push(4);
          } else if (isNamaKhandha) {
              possibleSteps.push(3, 4, 5);
              if (isPancaVinnana) possibleSteps.push(7);
          }
          if (hasBhavangaSamphassa) possibleSteps.push(6);
          if (hasManasikara) possibleSteps.push(8);
          if (isSamphassaTarget) possibleSteps.push(9);
          if (hasPreSamphassa) possibleSteps.push(10);
          
          nextStep = possibleSteps.find(s => s > paticcaStep) || 0;
      } else {
          if (paticcaStep >= 5) nextStep = 0;
      }
      const next = nextStep;
      
      if (next === 1) {
          setPaticcaSavedState({ phase: activePhase, index: currentIndex });
          if (activePhase !== 'patisandhi') setActivePhase('patisandhi');
      } else if (next === 3 && paticcaStep === 0) {
          setPaticcaSavedState({ phase: activePhase, index: currentIndex });
      }
      
      setPaticcaStep(next);
      if (next === 1 || (next === 3 && paticcaStep === 0)) {
          const savedKhandha = khandhaViewIndex;
          const snapNode = {...activeNode};
          setPaticcaCittaName(snapNode.name);
          setPaticcaKhandha(savedKhandha);
          setPaticcaLockedNodeData(snapNode);
          setPaticcaOriginalNodeData(activeNode);
          if ([2,3,4,5,6].includes(savedKhandha)) {
              setKhandhaViewIndex(savedKhandha);
          }
      }
      if (next === 0) {
          setPaticcaLockedNodeData(null);
      }
      if (next === 0) {
          setPaticcaCittaName("");
          setPaticcaKhandha(0);
          setSankharaOnlyCetana(false);
      }

      if (next > 0) {
          if (![1,2,3,4,5,6].includes(khandhaViewIndex)) setKhandhaViewIndex(1);
      } else {
         setKhandhaViewIndex(0);
         if (paticcaSavedState) {
             const restorePhase = paticcaSavedState.phase;
             const restoreIndex = paticcaSavedState.index;
             if (restorePhase !== activePhase) {
                 setActivePhase(restorePhase);
                 setTimeout(() => setCurrentIndex(restoreIndex), 100);
             } else {
                 setCurrentIndex(restoreIndex);
             }
         }
         setPaticcaSavedState(null);
      }
  };

  const handleBhavangaSelect = (gId, subIdx) => {
      setBhavangaGroupId(gId);
      setBhavangaSubIndex(subIdx);
      setIsPlaying(false);
      setTadaCycleIndex(0);
      setShowBhavangaMenu(false);
      
      const group = VIPAKA_GROUPS.find(g => g.id === gId);
      if (group && group.options[subIdx]) {
          const bhvId = group.options[subIdx].id;
          const linkedPuggala = getPuggalaFromBhavanga(bhvId);
          if (linkedPuggala && !isLifeLocked) {
              setPuggalaByLife(prev => ({ ...prev, [currentLifeOffset]: linkedPuggala }));
          }
      }
  };

  const handleVithiChange = (e) => {
      const newVithi = e.target.value;
      setActiveVithi(newVithi);
      setCurrentIndex(0);
      setIsPlaying(false);
      setPancaDvaraVariation(0);
      setManoKamaVariation(0);
      setAppanaVariation(0);
      
      const validGroupsRaw = getAvailableJavanaGroupsRaw(newVithi, activePuggalaId);
      const validGroups = validGroupsRaw.map(g => {
          return { ...g, options: getFilteredJavanaOptions(g.id, activePuggalaId) };
      }).filter(g => g.options && g.options.length > 0);

      if (validGroups.length > 0 && !validGroups.some(g => g.id === javanaGroupId)) {
          setJavanaGroupId(validGroups[0].id);
          
          if (validGroups[0].id.includes('rupa_jhana') || validGroups[0].id.includes('abhinna')) {
              const valid = getValidJhanaIndices(rupaArammanaIndex);
              setJavanaSubIndex(valid[0]);
          } else {
              setJavanaSubIndex(0);
          }
          setLokuttaraJhanaIndex(0);
      }
  };

  const handleJavanaGroupChange = (e) => {
      const val = e.target.value;
      setJavanaGroupId(val);
      
      if (val.startsWith('rupa_jhana') || val.includes('abhinna')) {
          const valid = getValidJhanaIndices(rupaArammanaIndex);
          setJavanaSubIndex(valid[0]);
      } else {
          setJavanaSubIndex(0);
      }

      setLokuttaraJhanaIndex(0);
      setIsPlaying(false); 
      setTadaCycleIndex(0); 

      if (val === 'nirodha_3' && !isLifeLocked) setPuggalaByLife(prev => ({ ...prev, [currentLifeOffset]: 'anagami_kama' }));
      if (val === 'nirodha_4' && !isLifeLocked) setPuggalaByLife(prev => ({ ...prev, [currentLifeOffset]: 'arahant_kama' }));
  };

  const setBhavangaById = (id) => {
      for(let g of VIPAKA_GROUPS) {
          const idx = g.options.findIndex(o => o.id === id);
          if (idx !== -1) {
              setBhavangaGroupId(g.id);
              setBhavangaSubIndex(idx);
              setIsPlaying(false);
              setTadaCycleIndex(0);
              return;
          }
      }
  };

  const [promptModal, setPromptModal] = useState({ isOpen: false, type: '', value: '' });
  const [toastMessage, setToastMessage] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedCetasika, setSelectedCetasika] = useState(null); 
  const [selectedBaseForModal, setSelectedBaseForModal] = useState(null);
  const [hoverLakkana, setHoverLakkana] = useState(""); 

  const timelineRef = useRef(null);

  const getLifeName = (offset) => {
    if (offset === 0) return "Hiện tại";
    if (offset === -1) return "Quá khứ 1";
    if (offset === -2) return "Quá khứ 2";
    if (offset === 1) return "Tương lai 1";
    if (offset === 2) return "Tương lai 2";
    if (offset < -2) return `Quá khứ ${Math.abs(offset)}`;
    return `Tương lai ${offset}`;
  };

  const handleMouseEnter = (itemName) => {
    if (!itemName || itemName.includes("Diệt tận định")) return;

    let details = "";
    if (CETASIKA_DICT[itemName]) {
        details = CETASIKA_DICT[itemName].lakkana;
    } else {
        const currentJavanaGroup = availableJavanaGroups.find(g => g.id === javanaGroupId) || availableJavanaGroups[0] || { options: [] };
        const info = getActiveCittaInfo(itemName, currentJavanaGroup.options?.[javanaSubIndex]?.id);
        if (info) details = info.lakkana;
    }
    if(details) {
        const cleanName = itemName.replace(/^[0-9]+\.\s*/, '').replace(/^[0-9]+\s*-\s*/, '');
        setHoverLakkana(`${cleanName} - ${details}`);
    }
  };
  const handleMouseLeave = () => setHoverLakkana("");

  const getJavanaVedana = (jid, subIndex) => {
      const opts = getFilteredJavanaOptions(jid, activePuggalaId);
      if (!opts || opts.length === 0) return 'U';
      const label = opts[subIndex]?.label || "";
      if (label.includes("Thọ Hỷ")) return 'S';
      if (label.includes("Thọ Ưu")) return 'D';
      return 'U';
  };

  const getBhavangaVedana = (bid, subIndex) => {
      const group = VIPAKA_GROUPS.find(g => g.id === bid);
      if (!group) return 'U';
      const opt = group.options[subIndex] || group.options[0];
      if (opt && opt.label.includes("Thọ Hỷ")) return 'S';
      return 'U';
  };

  const availableTadarammanas = useMemo(() => {
      const jVedana = getJavanaVedana(javanaGroupId, javanaSubIndex);
      return getAvailableTadarammanas(jVedana, aramQIndex, activePuggalaId);
  }, [javanaGroupId, javanaSubIndex, aramQIndex, activePuggalaId]);

  const vithiData = useMemo(() => {
    const currentJavanaGroup = availableJavanaGroups.find(g => g.id === javanaGroupId) || availableJavanaGroups[0] || { options: [] };
    const activeJavana = currentJavanaGroup.options?.[javanaSubIndex] || currentJavanaGroup.options?.[0] || { cetasikas: [], label: "" };
    const activeBhavanga = currentBhavangaGroup.options?.[bhavangaSubIndex] || currentBhavangaGroup.options?.[0] || { cetasikas: [], label: "" };

    const jVedana = getJavanaVedana(javanaGroupId, javanaSubIndex);
    const bVedana = getBhavangaVedana(bhavangaGroupId, bhavangaSubIndex);
    const selectedTada = availableTadarammanas.length > 0 ? availableTadarammanas[tadaCycleIndex % availableTadarammanas.length] : null;
    const agantukaBhavanga = (aramQIndex === 3) ? Ahetuka_Vipaka[0] : Ahetuka_Vipaka[1];

    const aramPast = customArammanas.past_life;
    const aramPresent = customArammanas.present_life;
    const aramFuture = customArammanas.future_life;

    const result = [];

    const pushNode = (vithiName, name, base, cetasikas, aramana, options = {}) => {
      let finalCetasikas = [...(cetasikas || [])];

      let finalBase = base;
      if (activePuggalaId.includes('arupa')) {
          finalBase = "Không";
      }

      if (aramQIndex === 3) {
          const vithiVipakaKeywords = ["Thức", "Tiếp thâu", "Quan sát", "Đồng sở duyên"];
          const isVithiVipaka = vithiVipakaKeywords.some(v => name.includes(v));
          
          if (isVithiVipaka) {
              finalCetasikas = finalCetasikas.filter(c => !["Hỷ", "Thọ Hỷ", "Thọ Lạc", "Thọ Xả", "Thọ Ưu", "Thọ Khổ"].includes(c));
              if (name.includes("Thân thức")) finalCetasikas.push("Thọ Khổ");
              else finalCetasikas.push("Thọ Xả");
          }
      }

      if (name.includes("Đổng tốc") && activePhase === 'pavatti' && activeVithi === 'mano_kama') {
          const isMahaKusala = javanaGroupId === 'kama_kusala';
          const isMahaKiriya = javanaGroupId === 'kama_kiriya';
          if (isMahaKusala) {
              if (aramana.includes("Đối tượng của Chánh ngữ") && !finalCetasikas.includes("Chánh ngữ")) finalCetasikas.push("Chánh ngữ");
              if (aramana.includes("Đối tượng của Chánh nghiệp") && !finalCetasikas.includes("Chánh nghiệp")) finalCetasikas.push("Chánh nghiệp");
              if (aramana.includes("Đối tượng của Chánh mạng") && !finalCetasikas.includes("Chánh mạng")) finalCetasikas.push("Chánh mạng");
          }
          if (isMahaKusala || isMahaKiriya) {
              finalCetasikas = finalCetasikas.filter(c => c !== "Bi mẫn" && c !== "Tùy hỷ");
              if (aramana.includes("Đối tượng của Bi")) finalCetasikas.push("Bi mẫn");
              if (aramana.includes("Đối tượng của Hỷ")) finalCetasikas.push("Tùy hỷ");
          }
      }

      finalCetasikas.sort((a, b) => (SORT_ORDER[a] || 99) - (SORT_ORDER[b] || 99));

      result.push({ 
        id: Math.random().toString(36).substr(2, 9), 
        vithi: vithiName, name, base: finalBase, 
        cetasikas: finalCetasikas, count: finalCetasikas.length, cetasikaOnlyCount: finalCetasikas.filter(c => c !== "Tâm").length,
        aramana, ...options 
      });
    };

    const getJavanaNodeParams = (defaultAram) => {
        let c = [...(activeJavana.cetasikas || [])];
        let a = defaultAram;

        if (javanaGroupId.startsWith('magga_') || javanaGroupId.startsWith('phala_') || javanaGroupId.startsWith('nirodha_')) {
            c = getLokuttaraCetasikas(lokuttaraJhanaIndex);
            a = "Niết Bàn";
        } else if (javanaGroupId.includes('arupa_jhana')) {
            a = ARUPA_ARAMMANA_OPTIONS[javanaSubIndex] || ARUPA_ARAMMANA_OPTIONS[0];
        } else if (javanaGroupId.startsWith('rupa_jhana') || javanaGroupId.includes('abhinna')) {
            a = RUPA_ARAMMANA_OPTIONS[rupaArammanaIndex];
            c = c.filter(cet => cet !== "Bi mẫn" && cet !== "Tùy hỷ");
            if (javanaSubIndex <= 3) {
                if (rupaArammanaIndex === 4) { c.push("Bi mẫn"); c.push("Tùy hỷ"); } 
            }
        }
        return { c, a };
    };

    const generateJavanaName = () => {
        if (javanaGroupId.startsWith('magga_') || javanaGroupId.startsWith('phala_') || javanaGroupId.startsWith('nirodha_')) {
            return (activeJavana.label || "") + ` (Thiền ${toMyanmarNum(lokuttaraJhanaIndex + 1)})`;
        }
        return activeJavana.label || "Đổng tốc";
    };

    const buildAvijjaSeq = (lifePhase, oldAram) => {
        const avijjaOffset = lifePhase === 'past' ? currentLifeOffset - 1 : currentLifeOffset;
        const avijjaState = getAvijjaState(avijjaOffset);
        const lobhaOpts = JAVANA_GROUPS.find(g => g.id === 'akusala_lobha').options;
        const _N6A = ['Cảnh sắc','Cảnh thinh','Cảnh hương','Cảnh vị','Cảnh xúc','Cảnh pháp'];
        const aramAvijja = selectedNidana === 6 ? _N6A[nidanaCycleIndex % 6] : "6 Cảnh";

        for (let v=0; v<2; v++) {
            const jOpt = lobhaOpts[avijjaState.javanaIdx];
            const vVara = avijjaState.vara;
            const vName = v === 0 ? "Ý môn lộ Vô minh/Ái" : "Ý môn lộ Thủ";
            pushNode("Tâm ngoại lộ", "Hữu phần rúng động", "Ý căn-63", activeBhavanga.cetasikas, oldAram, { isBhavangaNode: true, specificName: activeBhavanga.label });
            pushNode("Tâm ngoại lộ", "Hữu phần dứt dòng", "Ý căn-63", activeBhavanga.cetasikas, oldAram, { isBhavangaNode: true, specificName: activeBhavanga.label });
            pushNode(vName, "Ý môn hướng tâm", "Ý căn-63", set12B, aramAvijja, { isAvijjaNode: true, avijjaIdx: v, nodeType: 'vajjana' });
            
            for(let i=1; i<=7; i++) {
                pushNode(vName, `${toMyanmarNum(i)} - Đổng tốc (Tham căn)`, "Ý căn-63", jOpt.cetasikas, aramAvijja, { isAvijjaNode: true, avijjaIdx: v, nodeType: 'javana', specificName: jOpt.label });
            }
            
            if (vVara === 0) { 
                const jVedanaTemp = jOpt.label.includes("Thọ Hỷ") ? 'S' : 'U';
                const avTadas = getAvailableTadarammanas(jVedanaTemp, aramQIndex, activePuggalaId);
                const tOpt = avTadas.length > 0 ? avTadas[avijjaState.tadaIdx % avTadas.length] : null;
                if (tOpt) {
                    pushNode(vName, "1 - Đồng sở duyên", "Ý căn-63", tOpt.cetasikas, aramAvijja, { isAvijjaNode: true, avijjaIdx: v, nodeType: 'tada', specificName: tOpt.label });
                    pushNode(vName, "2 - Đồng sở duyên", "Ý căn-63", tOpt.cetasikas, aramAvijja, { isAvijjaNode: true, avijjaIdx: v, nodeType: 'tada', specificName: tOpt.label });
                }
            }

            for(let b=0; b<1; b++) {
                pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, oldAram, { isBhavangaNode: true, specificName: activeBhavanga.label });
            }
        }
    };

    const buildSankharaSeq = (lifePhase, oldAram) => {
        const sankharaOffset = lifePhase === 'past' ? currentLifeOffset - 1 : currentLifeOffset;
        const sankharaState = getSankharaState(sankharaOffset);
        const vName = "Ý môn lộ Hành";
        const aram = "6 Cảnh";
        const isJhana = sankharaState.vara === 2;
        const hasTada = sankharaState.vara === 0 && !isJhana;

        const sGroup = JAVANA_GROUPS.find(g => g.id === sankharaState.javanaGroupId) || JAVANA_GROUPS.find(g => g.id === 'kama_kusala');
        let sOpts = getFilteredJavanaOptions(sGroup.id, activePuggalaId);
        if (sOpts.length === 0) sOpts = sGroup.options; 
        const sOpt = sOpts[sankharaState.javanaIdx % sOpts.length] || sGroup.options[0];

        if (isJhana) {
            let actualAram = "Tướng quang của Kasina v.v.";
            if (sankharaState.javanaGroupId.includes('arupa_jhana')) {
                actualAram = ARUPA_ARAMMANA_OPTIONS[sankharaState.javanaIdx % 4] || ARUPA_ARAMMANA_OPTIONS[0];
            }
            pushNode("Tâm ngoại lộ", "Hữu phần rúng động", "Ý căn-63", activeBhavanga.cetasikas, oldAram, { isBhavangaNode: true, specificName: activeBhavanga.label });
            pushNode("Tâm ngoại lộ", "Hữu phần dứt dòng", "Ý căn-63", activeBhavanga.cetasikas, oldAram, { isBhavangaNode: true, specificName: activeBhavanga.label });
            pushNode(vName, "Ý môn hướng tâm", "Ý căn-63", set12B, actualAram, { isSankharaNode: true, nodeType: 'vajjana' });
            
            const preCetasikas = JAVANA_GROUPS.find(g => g.id === 'kama_kusala').options[0].cetasikas;
            pushNode(vName, "Chuẩn bị", "Ý căn-63", preCetasikas, actualAram);
            pushNode(vName, "Cận hành", "Ý căn-63", preCetasikas, actualAram);
            pushNode(vName, "Thuận thứ", "Ý căn-63", preCetasikas, actualAram);
            pushNode(vName, "Chuyển tộc", "Ý căn-63", preCetasikas, actualAram);
            
            for(let i=1; i<=10; i++) {
                pushNode(vName, `${toMyanmarNum(i)} - Thiền đổng tốc`, "Ý căn-63", sOpt.cetasikas, actualAram, { isSankharaNode: true, nodeType: 'javana', specificName: sOpt.label });
            }
            
            for(let b=0; b<3; b++) {
                pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, oldAram, { isBhavangaNode: true, specificName: activeBhavanga.label });
            }
        } else {
            pushNode("Tâm ngoại lộ", "Hữu phần rúng động", "Ý căn-63", activeBhavanga.cetasikas, oldAram, { isBhavangaNode: true, specificName: activeBhavanga.label });
            pushNode("Tâm ngoại lộ", "Hữu phần dứt dòng", "Ý căn-63", activeBhavanga.cetasikas, oldAram, { isBhavangaNode: true, specificName: activeBhavanga.label });
            pushNode(vName, "Ý môn hướng tâm", "Ý căn-63", set12B, aram, { isSankharaNode: true, nodeType: 'vajjana' });
            
            for(let i=1; i<=7; i++) {
                pushNode(vName, `${toMyanmarNum(i)} - Đổng tốc`, "Ý căn-63", sOpt.cetasikas, aram, { isSankharaNode: true, nodeType: 'javana', specificName: sOpt.label });
            }

            if (hasTada) {
                const jVedanaTemp = sOpt.label.includes("Thọ Hỷ") ? 'S' : (sOpt.label.includes("Thọ Ưu") ? 'D' : 'U');
                const avTadas = getAvailableTadarammanas(jVedanaTemp, sankharaState.aramQIndex, activePuggalaId);
                const tOpt = avTadas.length > 0 ? avTadas[sankharaState.tadaIdx % avTadas.length] : null;
                if (tOpt) {
                    pushNode(vName, "1 - Đồng sở duyên", "Ý căn-63", tOpt.cetasikas, aram, { isSankharaNode: true, nodeType: 'tada', specificName: tOpt.label });
                    pushNode(vName, "2 - Đồng sở duyên", "Ý căn-63", tOpt.cetasikas, aram, { isSankharaNode: true, nodeType: 'tada', specificName: tOpt.label });
                } else if (jVedanaTemp === 'D') {
                     const agantukaBhavanga = (sankharaState.aramQIndex === 3) ? Ahetuka_Vipaka[0] : Ahetuka_Vipaka[1];
                     pushNode(vName, "Hữu phần khách", "Ý căn-63", agantukaBhavanga.cetasikas, aram, { isSankharaNode: true, nodeType: 'tada', specificName: agantukaBhavanga.label }); 
                }
            } else if (sOpt.label.includes("Thọ Ưu") && activeBhavanga.label.includes("Thọ Hỷ")) {
                const agantukaBhavanga = (sankharaState.aramQIndex === 3) ? Ahetuka_Vipaka[0] : Ahetuka_Vipaka[1];
                pushNode(vName, "Hữu phần khách", "Ý căn-63", agantukaBhavanga.cetasikas, aram, { isSankharaNode: true, nodeType: 'tada', specificName: agantukaBhavanga.label }); 
            }

            for(let b=0; b<3; b++) {
                pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, oldAram, { isBhavangaNode: true, specificName: activeBhavanga.label });
            }
        }
    };

    const buildMaranasannaSeq = (variation, lifePhase, newAram, oldAram) => {
        const seq = [];
        const maranaOffset = lifePhase === 'past' ? currentLifeOffset - 1 : currentLifeOffset;
        const sankharaState = getSankharaState(maranaOffset);
        const mSGroup = JAVANA_GROUPS.find(g => g.id === sankharaState.javanaGroupId);
        let mSOpts = getFilteredJavanaOptions(mSGroup.id, activePuggalaId);
        if (!mSOpts || mSOpts.length === 0) mSOpts = mSGroup.options;
        const maranaJavana = mSOpts[sankharaState.javanaIdx % mSOpts.length] || mSGroup.options[0];
        const isTadaAllowed = !activePuggalaId.includes('rupa') && !activePuggalaId.includes('arupa');
        const hasTada = (variation === 0 || variation === 2) && isTadaAllowed;
        const hasBhavanga = (variation === 2 || variation === 3);

        seq.push({ vName: "Tâm ngoại lộ", name: "Hữu phần rúng động", b: "Ý căn-63", c: activeBhavanga.cetasikas, a: oldAram, promptType: lifePhase === 'past' ? 'past_life' : 'present_life', isBhavangaNode: true, specificName: activeBhavanga.label });
        seq.push({ vName: "Tâm ngoại lộ", name: "Hữu phần dứt dòng", b: "Ý căn-63", c: activeBhavanga.cetasikas, a: oldAram, isBhavangaNode: true, specificName: activeBhavanga.label });
        seq.push({ vName: "Ý môn lộ Cận tử", name: "Ý môn hướng tâm", b: "Ý căn-63", c: set12B, a: newAram, promptType: lifePhase === 'past' ? 'present_life' : 'future_life' });
        
        for(let i=1; i<=5; i++) {
            seq.push({ vName: "Ý môn lộ Cận tử", name: `${toMyanmarNum(i)} - Đổng tốc`, b: "Ý căn-63", c: maranaJavana.cetasikas, a: newAram, isJavanaNode: true, specificName: maranaJavana.label });
        }
        
        if (hasTada) {
            if (selectedTada) {
                seq.push({ vName: "Ý môn lộ Cận tử", name: "1 - Đồng sở duyên", b: "Ý căn-63", c: selectedTada.cetasikas, a: newAram, isTadarammana: true, specificName: selectedTada.label });
                seq.push({ vName: "Ý môn lộ Cận tử", name: "2 - Đồng sở duyên", b: "Ý căn-63", c: selectedTada.cetasikas, a: newAram, isTadarammana: true, specificName: selectedTada.label });
            } else if (jVedana === 'D' && bVedana === 'S') {
                seq.push({ vName: "Ý môn lộ Cận tử", name: "Hữu phần khách", b: "Ý căn-63", c: agantukaBhavanga.cetasikas, a: newAram, specificName: agantukaBhavanga.label });
            }
        } else if (jVedana === 'D' && bVedana === 'S' && isTadaAllowed) {
            seq.push({ vName: "Ý môn lộ Cận tử", name: "Hữu phần khách", b: "Ý căn-63", c: agantukaBhavanga.cetasikas, a: newAram, specificName: agantukaBhavanga.label });
        }
        
        if (hasBhavanga) {
            const bvCount = variation === 2 ? 2 : 1; 
            for(let i=1; i<=bvCount; i++) {
                seq.push({ vName: "Tâm ngoại lộ", name: "Hữu phần", b: "Ý căn-63", c: activeBhavanga.cetasikas, a: oldAram, isBhavangaNode: true, specificName: activeBhavanga.label });
            }
        }
        
        seq.push({ vName: "Tâm ngoại lộ", name: "Tử tâm", b: "Ý căn-63", c: activeBhavanga.cetasikas, a: oldAram, isCutiNode: true, lPhase: lifePhase, specificName: activeBhavanga.label });

        const finalSeq = [];
        const paddingNeed = 17 - seq.length;
        for(let i=0; i<paddingNeed; i++) {
            finalSeq.push({ vName: "Tâm ngoại lộ", name: "Hữu phần", b: "Ý căn-63", c: activeBhavanga.cetasikas, a: oldAram, isBhavangaNode: true, specificName: activeBhavanga.label });
        }
        finalSeq.push(...seq);

        finalSeq.forEach((node, idx) => {
            pushNode(node.vName, node.name, node.b, node.c, node.a, { displayNum: toMyanmarNum(17 - idx), isCutiNode: node.isCutiNode, lifePhase: node.lPhase, promptType: node.promptType, isTadarammana: node.isTadarammana, specificName: node.specificName, isBhavangaNode: node.isBhavangaNode, isJavanaNode: node.isJavanaNode, isMaranaNode: true });
        });
    };

    if (activePhase === 'patisandhi') {
      buildAvijjaSeq('past', aramPast);
      buildSankharaSeq('past', aramPast);
      buildMaranasannaSeq(pastCutiVariation, 'past', aramPresent, aramPast);

      pushNode("Tâm ngoại lộ", "Kiết sanh", "Ý căn-30", activeBhavanga.cetasikas, aramPresent, { startNumberingHere: true, promptType: 'present_life', isLifeDividerBefore: true, isBhavangaNode: true, specificName: activeBhavanga.label });
      for(let i=1; i<=14; i++) {
        pushNode("Tâm ngoại lộ", `Hữu phần`, "Ý căn-46", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
      }
      pushNode("Tâm ngoại lộ", "Hữu phần rúng động", "Ý căn-46", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
      pushNode("Tâm ngoại lộ", "Hữu phần dứt dòng", "Ý căn-46", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
      const lobhaOptions = getFilteredJavanaOptions('akusala_lobha', activePuggalaId);
      const lobhaJavana = lobhaOptions[0] || { cetasikas: [], label: "Đổng tốc" };
      
      pushNode("Ý môn lộ Luyến ái kiếp sống", "Ý môn hướng tâm", "Ý căn-46", set12B, "Kiếp sống mới");
      for(let i=1; i<=7; i++) {
        pushNode("Ý môn lộ Luyến ái kiếp sống", `${toMyanmarNum(i)} - Đổng tốc (Tham căn)`, "Ý căn-46", lobhaJavana.cetasikas, "Kiếp sống mới", { isJavanaNode: true, specificName: lobhaJavana.label });
      }
      for(let i=1; i<=3; i++) {
        pushNode("Tâm ngoại lộ", `Hữu phần`, "Ý căn-46", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
      }

    } else if (activePhase === 'pavatti') {
      if (['cakkhu', 'sota', 'ghana', 'jivha', 'kaya'].includes(activeVithi)) {
          const pancaInfo = PANCADVARA_INFO[activeVithi];
          const viññāṇaSet = pancaInfo.vedanā === "Thọ Lạc" ? set8_Sukha : set8_Upekkha;
          let aramRaw = activeVithi === 'kaya' ? KAYA_ARAMMANA_OPTIONS[kayaArammanaIndex] : pancaInfo.ārammaṇa;
          const aram = `${aramRaw} (${ARAM_Q_LABELS[aramQIndex]})`;
          
          let atitaCount = 0; let vara = ''; const type = pancaDvaraVariation;
          if (type === 0) { atitaCount = 1; vara = 'Tadarammana'; }
          else if (type === 1) { atitaCount = 2; vara = 'Javana'; }
          else if (type === 2) { atitaCount = 3; vara = 'Javana'; }
          else if (type >= 3 && type <= 8) { atitaCount = type + 1; vara = 'Votthappana'; }
          else if (type >= 9 && type <= 14) { atitaCount = type + 1; vara = 'Mogha'; } 

          const vithiNameWithVar = `${pancaInfo.vīthi}`;

          for(let i=0; i<atitaCount; i++) pushNode("Tâm ngoại lộ", "Hữu phần vừa qua", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
          pushNode("Tâm ngoại lộ", "Hữu phần rúng động", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
          pushNode("Tâm ngoại lộ", "Hữu phần dứt dòng", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });

          let viññāṇaSpecific = (aramQIndex === 3 ? "Bất thiện quả " : "Thiện quả vô nhân ") + pancaInfo.viññāṇa;
          let sampaSpecific = (aramQIndex === 3 ? "Bất thiện quả " : "Thiện quả vô nhân ") + "Tiếp thâu";
          
          let santiSpecific = "";
          if (aramQIndex === 3) santiSpecific = "Bất thiện quả Thọ Xả Quan sát";
          else if (aramQIndex === 1 || aramQIndex === 2) santiSpecific = "Thiện quả vô nhân Thọ Xả Quan sát";
          else santiSpecific = "Thiện quả vô nhân Thọ Hỷ Quan sát";

          const santiranaSet = (aramQIndex === 0) ? set12A : set11;

          if (vara === 'Mogha') {
              while(result.length < 17) pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
          } else {
              pushNode(vithiNameWithVar, "Ngũ môn hướng tâm", "Ý căn-63", set11, aram);
              pushNode(vithiNameWithVar, pancaInfo.viññāṇa, pancaInfo.base, viññāṇaSet, aram, { specificName: viññāṇaSpecific });
              pushNode(vithiNameWithVar, "Tiếp thâu", "Ý căn-63", set11, aram, { specificName: sampaSpecific });
              pushNode(vithiNameWithVar, "Quan sát", "Ý căn-63", santiranaSet, aram, { specificName: santiSpecific });
              
              if (vara === 'Votthappana') {
                  pushNode(vithiNameWithVar, "Phân đoán", "Ý căn-63", set12B, aram);
                  pushNode(vithiNameWithVar, "Phân đoán", "Ý căn-63", set12B, aram);
                  pushNode(vithiNameWithVar, "Phân đoán", "Ý căn-63", set12B, aram);
                  while(result.length < 17) pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
              } else {
                  pushNode(vithiNameWithVar, "Phân đoán", "Ý căn-63", set12B, aram);
                  const { c: jCetasikas, a: jAram } = getJavanaNodeParams(aram);
                  for(let i=1; i<=7; i++) pushNode(vithiNameWithVar, `${toMyanmarNum(i)} - Đổng tốc`, "Ý căn-63", jCetasikas, jAram, { isJavanaNode: true, specificName: generateJavanaName() });
                  if (vara === 'Tadarammana') {
                      if (selectedTada) {
                          pushNode(vithiNameWithVar, "1 - Đồng sở duyên", "Ý căn-63", selectedTada.cetasikas, aram, { isTadarammana: true, specificName: selectedTada.label });
                          pushNode(vithiNameWithVar, "2 - Đồng sở duyên", "Ý căn-63", selectedTada.cetasikas, aram, { isTadarammana: true, specificName: selectedTada.label });
                      } else {
                          if (jVedana === 'D' && bVedana === 'S') {
                              pushNode(vithiNameWithVar, "Hữu phần khách", "Ý căn-63", agantukaBhavanga.cetasikas, aram, { specificName: agantukaBhavanga.label });
                          }
                          while(result.length < 17) pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
                      }
                  } else {
                      if (jVedana === 'D' && bVedana === 'S') {
                          pushNode(vithiNameWithVar, "Hữu phần khách", "Ý căn-63", agantukaBhavanga.cetasikas, aram, { specificName: agantukaBhavanga.label });
                      }
                      while(result.length < 17) pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
                  }
              }
          }

          const pushTadanuvattika = (vName, aramName) => {
              pushNode("Tâm ngoại lộ", "Hữu phần rúng động", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
              pushNode("Tâm ngoại lộ", "Hữu phần dứt dòng", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
              pushNode(vName, "Ý môn hướng tâm", "Ý căn-63", set12B, aramName);
              const { c: jCetasikas, a: jAram } = getJavanaNodeParams(aramName);
              for(let i=1; i<=7; i++) pushNode(vName, `${toMyanmarNum(i)} - Đổng tốc`, "Ý căn-63", jCetasikas, jAram, { isJavanaNode: true, specificName: generateJavanaName() });
              if (vara === 'Tadarammana') {
                  if (selectedTada) {
                      pushNode(vName, "1 - Đồng sở duyên", "Ý căn-63", selectedTada.cetasikas, aramName, { isTadarammana: true, specificName: selectedTada.label });
                      pushNode(vName, "2 - Đồng sở duyên", "Ý căn-63", selectedTada.cetasikas, aramName, { isTadarammana: true, specificName: selectedTada.label });
                  } else if (jVedana === 'D' && bVedana === 'S') {
                      pushNode(vName, "Hữu phần khách", "Ý căn-63", agantukaBhavanga.cetasikas, aramName, { specificName: agantukaBhavanga.label });
                  }
              } else if (jVedana === 'D' && bVedana === 'S') {
                  pushNode(vName, "Hữu phần khách", "Ý căn-63", agantukaBhavanga.cetasikas, aramName, { specificName: agantukaBhavanga.label });
              }
              pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
          };

          if (vara === 'Tadarammana' || vara === 'Javana') {
              pushTadanuvattika("Ý môn lộ Bắt lại cảnh cũ", `Cảnh Ngũ môn quá khứ (${ARAM_Q_LABELS[aramQIndex]})`);
              pushTadanuvattika("Ý môn lộ Bắt cảnh tổng hợp", `Cảnh gộp lại (${ARAM_Q_LABELS[aramQIndex]})`);
              pushTadanuvattika("Ý môn lộ Bắt ý nghĩa", `Cảnh ý nghĩa (${ARAM_Q_LABELS[aramQIndex]})`);
              pushTadanuvattika("Ý môn lộ Bắt tên gọi", `Cảnh danh xưng (${ARAM_Q_LABELS[aramQIndex]})`);
          }

      } else {
          const isQuick = appanaVariation === 1;
          const defaultAram = activeVithi === 'mano_kama' ? `${selectedArammana} (${ARAM_Q_LABELS[aramQIndex]})` : (activeVithi.includes('appana') && !activeVithi.includes('magga') && !activeVithi.includes('phala') && !activeVithi.includes('nirodha') ? "Tướng quang Kasina v.v." : "Niết Bàn");
          let vName = activeVithi === 'mano_kama' ? "Ý môn Dục tốc" : "Ý môn lộ An chỉ";

          let prepAram = defaultAram;
          if (activeVithi === 'appana_magga') prepAram = "Cảnh Hành";
          else if (activeVithi === 'appana_nirodha') prepAram = "Vô sở hữu xứ Thức";
          else if (javanaGroupId.includes('arupa_jhana')) prepAram = ARUPA_ARAMMANA_OPTIONS[javanaSubIndex] || ARUPA_ARAMMANA_OPTIONS[0];
          else if (javanaGroupId.startsWith('rupa_jhana') || javanaGroupId.includes('abhinna')) prepAram = RUPA_ARAMMANA_OPTIONS[rupaArammanaIndex] || "Tướng quang Kasina v.v.";

          const aram = prepAram; 

          if (activeVithi === 'mano_kama' && manoKamaVariation === 3) {
             pushNode("Tâm ngoại lộ", "Hữu phần rúng động", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
             pushNode("Tâm ngoại lộ", "Hữu phần dứt dòng", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
             for(let i=0; i<3; i++) pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
          } else {
             pushNode("Tâm ngoại lộ", "Hữu phần rúng động", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
             pushNode("Tâm ngoại lộ", "Hữu phần dứt dòng", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
             pushNode(vName, "Ý môn hướng tâm", "Ý căn-63", set12B, prepAram);

             const kamaKusalaGroup = JAVANA_GROUPS.find(g => g.id === 'kama_kusala');
             const kamaKiriyaGroup = JAVANA_GROUPS.find(g => g.id === 'kama_kiriya');
             const kamaKusalaCetasikas = kamaKusalaGroup?.options[0]?.cetasikas || [];
             const kamaKiriyaCetasikas = kamaKiriyaGroup?.options[0]?.cetasikas || [];
             
             const addAppanaProcess = (isPhala = false) => {
                 let preCetasikas = kamaKusalaCetasikas;
                 if (activeVithi === 'appana_phala' && javanaGroupId === 'phala_4') preCetasikas = kamaKiriyaCetasikas;
                 if (activeVithi === 'appana_adhit') preCetasikas = kamaKiriyaCetasikas;
                 if (javanaGroupId.includes('kiriya')) preCetasikas = kamaKiriyaCetasikas;
                 
                 let gotrabhuAram = prepAram;
                 if (activeVithi === 'appana_magga') gotrabhuAram = "Niết Bàn";

                 if(!isQuick) pushNode(vName, "Chuẩn bị", "Ý căn-63", preCetasikas, prepAram);
                 pushNode(vName, "Cận hành", "Ý căn-63", preCetasikas, prepAram);
                 pushNode(vName, "Thuận thứ", "Ý căn-63", preCetasikas, prepAram);
                 if (!isPhala) pushNode(vName, "Chuyển tộc", "Ý căn-63", preCetasikas, gotrabhuAram); 
                 else pushNode(vName, "Tịnh diệu", "Ý căn-63", preCetasikas, prepAram);
             };

             if (activeVithi === 'mano_kama') {
                 if (manoKamaVariation === 2) {
                     pushNode(vName, "Ý môn hướng tâm", "Ý căn-63", set12B, aram);
                     pushNode(vName, "Ý môn hướng tâm", "Ý căn-63", set12B, aram);
                 } else {
                     const { c: jCetasikas, a: jAram } = getJavanaNodeParams(aram);
                     for(let i=1; i<=7; i++) pushNode(vName, `${toMyanmarNum(i)} - Đổng tốc`, "Ý căn-63", jCetasikas, jAram, { isJavanaNode: true, specificName: generateJavanaName() });
                     if (manoKamaVariation === 0) {
                         if (selectedTada) {
                             pushNode(vName, "1 - Đồng sở duyên", "Ý căn-63", selectedTada.cetasikas, aram, { isTadarammana: true, specificName: selectedTada.label });
                             pushNode(vName, "2 - Đồng sở duyên", "Ý căn-63", selectedTada.cetasikas, aram, { isTadarammana: true, specificName: selectedTada.label });
                         } else if (jVedana === 'D' && bVedana === 'S') {
                             pushNode(vName, "Hữu phần khách", "Ý căn-63", agantukaBhavanga.cetasikas, aram, { specificName: agantukaBhavanga.label });
                         }
                     } else if (manoKamaVariation === 1) {
                         if (jVedana === 'D' && bVedana === 'S') {
                             pushNode(vName, "Hữu phần khách", "Ý căn-63", agantukaBhavanga.cetasikas, aram, { specificName: agantukaBhavanga.label });
                         }
                     }
                 }
             } else {
                 const { c: appCetasikas, a: appAram } = getJavanaNodeParams(aram);
                 const addJavana = (name, count = 1) => {
                     for(let i=1; i<=count; i++) pushNode(vName, count > 1 ? `${toMyanmarNum(i)} - ${name}` : name, "Ý căn-63", appCetasikas, appAram, { isJavanaNode: true, specificName: generateJavanaName() });
                 };

                 switch(activeVithi) {
                     case 'appana_jhana_1': addAppanaProcess(); addJavana("Thiền"); break;
                     case 'appana_jhana_later': addAppanaProcess(); addJavana("Thiền", 15); break;
                     case 'appana_abhinna': addAppanaProcess(); addJavana("Thần thông"); break;
                     case 'appana_magga':
                         addAppanaProcess(); addJavana("Đạo");
                         for(let i=1; i<=(isQuick ? 3 : 2); i++) pushNode(vName, `${toMyanmarNum(i)} - Quả`, "Ý căn-63", appCetasikas, appAram, { isJavanaNode: true, specificName: generateJavanaName() });
                         
                         for(let i=1; i<=3; i++) pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });

                         const isArahatta = javanaGroupId === 'magga_4'; 
                         const reviewCount = isArahatta ? 4 : 5;
                         const reviewTargets = ["Đạo", "Quả", "Niết Bàn", "Phiền não đã đoạn tận", "Phiền não còn sót lại"];
                         const reviewJavanaCetasikas = isArahatta ? kamaKiriyaCetasikas : kamaKusalaCetasikas;

                         for(let r=0; r<reviewCount; r++) {
                             pushNode("Tâm ngoại lộ", "Hữu phần rúng động", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
                             pushNode("Tâm ngoại lộ", "Hữu phần dứt dòng", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
                             
                             const pVName = `Ý môn lộ Phản khán (${toMyanmarNum(r+1)})`;
                             const pAram = `Suy sát ${reviewTargets[r]}`;
                             pushNode(pVName, "Ý môn hướng tâm", "Ý căn-63", set12B, pAram);
                             for(let j=1; j<=7; j++) {
                                 pushNode(pVName, `${toMyanmarNum(j)} - Đổng tốc`, "Ý căn-63", reviewJavanaCetasikas, pAram); 
                             }
                             for(let b=1; b<=2; b++) pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
                         }
                         break;
                     case 'appana_phala': addAppanaProcess(true); addJavana("Quả", 15); break;
                     case 'appana_nirodha':
                         addAppProcess(); 
                         pushNode(vName, "1 - Phi tưởng phi phi tưởng", "Ý căn-63", arupaBase, "Vô sở hữu xứ Thức");
                         pushNode(vName, "2 - Phi tưởng phi phi tưởng", "Ý căn-63", arupaBase, "Vô sở hữu xứ Thức");
                         for(let i=1; i<=7; i++) {
                             pushNode(vName, "Diệt tận định", "Không", [], "Không", { specificName: "Diệt tận định (Nhập định thời gian dài)" }); 
                         }
                         pushNode(vName, "Quả", "Ý căn-63", getLokuttaraCetasikas(lokuttaraJhanaIndex), "Niết Bàn", { isJavanaNode: true, specificName: generateJavanaName() }); 
                         break;
                     case 'appana_adhit': addJavana("Đại Duy tác", 5); break;
                 }
             }
          }
      }
      
      if (activePhase === 'pavatti' && result.length > 0) {
          for(let i=0; i<4; i++) {
              pushNode("Tâm ngoại lộ", "Hữu phần", "Ý căn-63", activeBhavanga.cetasikas, aramPresent, { isBhavangaNode: true, specificName: activeBhavanga.label });
          }
      }
      
    } else if (activePhase === 'cuti') {
      buildAvijjaSeq('present', aramPresent);
      buildSankharaSeq('present', aramPresent);
      buildMaranasannaSeq(cutiVariation, 'present', aramFuture, aramPresent);

      const lobhaOptions = getFilteredJavanaOptions('akusala_lobha', activePuggalaId);
      const lobhaJavana = lobhaOptions[0] || { cetasikas: [], label: "Đổng tốc" };

      pushNode("Tâm ngoại lộ (Tương lai)", "Kiết sanh", "Ý căn-30", activeBhavanga.cetasikas, aramFuture, { promptType: 'future_life', isLifeDividerBefore: true, isBhavangaNode: true, specificName: activeBhavanga.label });
      for(let i=1; i<=14; i++) {
        pushNode("Tâm ngoại lộ (Tương lai)", `Hữu phần`, "Ý căn-46", activeBhavanga.cetasikas, aramFuture, { isBhavangaNode: true, specificName: activeBhavanga.label });
      }
      pushNode("Tâm ngoại lộ (Tương lai)", "Hữu phần rúng động", "Ý căn-46", activeBhavanga.cetasikas, aramFuture, { isBhavangaNode: true, specificName: activeBhavanga.label });
      pushNode("Tâm ngoại lộ (Tương lai)", "Hữu phần dứt dòng", "Ý căn-46", activeBhavanga.cetasikas, aramFuture, { isBhavangaNode: true, specificName: activeBhavanga.label });
      pushNode("Ý môn lộ Luyến ái (Tương lai)", "Ý môn hướng tâm", "Ý căn-46", set12B, "Kiếp sống mới");
      for(let i=1; i<=7; i++) {
        pushNode("Ý môn lộ Luyến ái (Tương lai)", `${toMyanmarNum(i)} - Đổng tốc`, "Ý căn-46", lobhaJavana.cetasikas, "Kiếp sống mới", { isJavanaNode: true, specificName: lobhaJavana.label });
      }
      for(let i=1; i<=3; i++) {
        pushNode("Tâm ngoại lộ (Tương lai)", `Hữu phần`, "Ý căn-46", activeBhavanga.cetasikas, aramFuture, { isBhavangaNode: true, specificName: activeBhavanga.label });
      }
    }

    if (activePhase !== 'cuti' && activePhase !== 'patisandhi') {
        let currentNum = 1;
        result.forEach(node => { node.displayNum = toMyanmarNum(currentNum++); });
    } else if (activePhase === 'patisandhi' || activePhase === 'cuti') {
        let currentNum = 1;
        let foundPatisandhi = false;
        result.forEach(node => {
            if (node.name === 'Kiết sanh') { foundPatisandhi = true; currentNum = 1; }
            if (foundPatisandhi) { node.displayNum = toMyanmarNum(currentNum++); }
            else if (!node.displayNum) { node.displayNum = toMyanmarNum(currentNum++); }
        });
    }

    return result;
  }, [activePhase, activeVithi, availableJavanaGroups, currentBhavangaGroup, javanaGroupId, javanaSubIndex, bhavangaGroupId, bhavangaSubIndex, selectedArammana, pancaDvaraVariation, manoKamaVariation, appanaVariation, kayaArammanaIndex, cutiVariation, pastCutiVariation, aramQIndex, tadaCycleIndex, customArammanas, lokuttaraJhanaIndex, rupaArammanaIndex, availableTadarammanas, activePuggalaId, avijjaStateByLife, sankharaStateByLife, currentLifeOffset, selectedNidana, nidanaCycleIndex]);

  useEffect(() => {
    if (paticcaStep === 3 && paticcaSavedState && paticcaSavedState.phase === activePhase) {
        return;
    }
    if (activePhase === 'patisandhi') setCurrentIndex(vithiData.findIndex(n => n.name === 'Kiết sanh') || 0);
    else if (activePhase === 'cuti') setCurrentIndex(vithiData.findIndex(n => n.name === 'Tử tâm') || 0);
    else setCurrentIndex(0);
  }, [activePhase]);

  useEffect(() => {
      if (paticcaStep === 2) {
          const targetIdx = vithiData.findIndex(n => n.isAvijjaNode);
          if (targetIdx !== -1) setCurrentIndex(targetIdx);
      } else if (paticcaStep === 2) {
          const targetIdx = vithiData.findIndex(n => n.isSankharaNode);
          if (targetIdx !== -1) setCurrentIndex(targetIdx);
      } else if (paticcaStep === 3) {
          if (paticcaSavedState) {
              if (activePhase !== paticcaSavedState.phase) {
                  setActivePhase(paticcaSavedState.phase);
              }
              const timer = setTimeout(() => {
                  setCurrentIndex(paticcaSavedState.index);
              }, 100);
              return () => clearTimeout(timer);
          }
      }
  }, [paticcaStep]);

  useEffect(() => {
      if (paticcaStep === 1) {
          const targetIdx = vithiData.findIndex(n => n.isAvijjaNode);
          if (targetIdx !== -1) setCurrentIndex(targetIdx);
      } else if (paticcaStep === 2) {
          const targetIdx = vithiData.findIndex(n => n.isSankharaNode);
          if (targetIdx !== -1) setCurrentIndex(targetIdx);
      }
  }, [paticcaStep, vithiData]);

  useEffect(() => {
    if (paticcaStep === 6) {
        const savedIdx = paticcaSavedState?.index ?? currentIndex;
        let foundIdx = -1;
        for (let i = savedIdx - 1; i >= 0; i--) {
            if (vithiData[i]?.isBhavangaNode) { foundIdx = i; break; }
        }
        if (foundIdx !== -1) setCurrentIndex(foundIdx);
    }
  }, [paticcaStep, vithiData]);

  useEffect(() => {
    if (paticcaStep === 10) {
        const savedIdx = paticcaSavedState?.index ?? currentIndex;
        const lockedName = paticcaLockedNodeData?.name || "";

        const isBhavangaOrVithimutta = 
            lockedName === "Hữu phần" || lockedName === "Hữu phần rúng động" ||
            lockedName === "Hữu phần dứt dòng" || lockedName === "Hữu phần vừa qua" ||
            lockedName === "Tử tâm" || lockedName === "Kiết sanh";

        let foundIdx = -1;
        if (isBhavangaOrVithimutta) {
            if (savedIdx - 1 >= 0) foundIdx = savedIdx - 1;
        } else {
            for (let i = savedIdx - 1; i >= 0; i--) {
                if (!vithiData[i]?.isBhavangaNode) { foundIdx = i; break; }
            }
        }
        if (foundIdx !== -1) setCurrentIndex(foundIdx);
    }
  }, [paticcaStep, vithiData]);

  useEffect(() => {
    const VIPAKA_TYPES = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
    const isKammaVinnana = selectedNidana === 2 && nidana2SubMode === 'kamma';

    if ((selectedNidana === 1 || isKammaVinnana) && nidanaViewMode === 'cause') {
        const idx = vithiData.findIndex(n => n.isSankharaNode);
        if (idx !== -1) setCurrentIndex(idx);
        else if (activePhase !== 'patisandhi') setActivePhase('patisandhi');
    }
    if ((selectedNidana === 1 || isKammaVinnana) && nidanaViewMode === 'effect') {
        const curType = VIPAKA_TYPES[nidanaCycleIndex % VIPAKA_TYPES.length];
        const idx = vithiData.findIndex(n => n.name === curType || n.name.includes(curType));
        if (idx !== -1) setCurrentIndex(idx);
        if (selectedNidana === 2 && nidana2SubMode === 'sahajata') {
            const VIPAKA_TYPES2 = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
            const curType2 = VIPAKA_TYPES2[nidanaCycleIndex % VIPAKA_TYPES2.length];
            const idx2 = vithiData.findIndex(n => n.name === curType2 || n.name.includes(curType2));
            if (idx2 !== -1) setCurrentIndex(idx2);
        }
    }
  }, [activePhase, activeVithi, vithiData.length, nidanaCycleIndex, nidanaViewMode, nidana2SubMode, selectedNidana]);

  useEffect(() => {
    const isSah = selectedNidana === 2 && nidana2SubMode === 'sahajata';
    const isNM = selectedNidana === 3 && nidana3SubMode === 'nama_mana';
    if (isSah || isNM) {
        const SAHCYC = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
        const curNode = vithiData[currentIndex];
        if (curNode) {
            const fi = SAHCYC.findIndex(t => curNode.name === t);
            if (fi !== -1 && fi !== nidanaCycleIndex) setNidanaCycleIndex(fi);
        }
    }
  }, [currentIndex, nidana2SubMode, nidana3SubMode, selectedNidana, isPlaying]);

  useEffect(() => {
    const isSah2 = selectedNidana === 2 && nidana2SubMode === 'sahajata';
    const isNM2 = selectedNidana === 3 && nidana3SubMode === 'nama_mana';
    if ((isSah2 || isNM2) && !isPlaying) {
        const SAHCYC = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
        const targetType = SAHCYC[nidanaCycleIndex % SAHCYC.length];
        let targetIdx = -1;
        if (targetType === 'Hữu phần') {
            const patIdx = vithiData.findIndex(n => n.name === 'Kiết sanh');
            targetIdx = vithiData.findIndex((n, i) => i > patIdx && n.isBhavangaNode && n.name === 'Hữu phần');
        } else {
            targetIdx = vithiData.findIndex(n => n.name === targetType || n.name.includes(targetType));
        }
        if (targetIdx !== -1 && targetIdx !== currentIndex) setCurrentIndex(targetIdx);
    }
  }, [nidanaCycleIndex, nidana2SubMode, nidana3SubMode, selectedNidana, vithiData.length]);

  useEffect(() => {
      if (paticcaStep === 8 || paticcaStep === 9) {
          const savedIdx = paticcaSavedState?.index ?? currentIndex;
          let targetName = "";
          
          if (paticcaStep === 8) {
              if (["Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức"].some(v => vithiData[savedIdx]?.name.includes(v))) {
                  targetName = "Ngũ môn hướng tâm";
              } else {
                  const vName = vithiData[savedIdx]?.vithi || "";
                  if (vName.includes("Ý môn") || vName.includes("An chỉ")) targetName = "Ý môn hướng tâm";
                  else targetName = "Phân đoán";
              }
          } else if (paticcaStep === 9) {
              targetName = "Thức"; 
          }

          let foundIdx = -1;
          for (let i = savedIdx - 1; i >= 0; i--) {
              if (vithiData[i]?.name.includes(targetName)) {
                  if (paticcaStep === 9 && !["Nhãn", "Nhĩ", "Tỷ", "Thiệt", "Thân"].some(v => vithiData[i]?.name.includes(v))) continue;
                  foundIdx = i; break; 
              }
          }
          if (foundIdx !== -1) setCurrentIndex(foundIdx);
      }
  }, [paticcaStep, vithiData]);

  useEffect(() => {
    if (selectedNidana !== 5 && selectedNidana !== 6) return;
    if (activePhase !== 'pavatti') {
        if (!(selectedNidana === 6 && nidana5SubMode === 'effect')) setNidanaCycleIndex(5);
        return;
    }
    const m = {'cakkhu':0,'sota':1,'ghana':2,'jivha':3,'kaya':4};
    setNidanaCycleIndex(m[activeVithi] !== undefined ? m[activeVithi] : 5);
  }, [activeVithi, selectedNidana, activePhase, nidana5SubMode]);

  useEffect(() => {
    if (selectedNidana !== 6) return;
    if (nidana5SubMode === 'cause' && activePhase === 'pavatti') {
        const jIdx = vithiData.findIndex(n => n.isJavanaNode);
        if (jIdx !== -1) setCurrentIndex(jIdx);
    } else if (nidana5SubMode === 'effect') {
        if (activePhase !== 'cuti') { setActivePhase('cuti'); return; }
        const aIdx = vithiData.findIndex(n => n.isAvijjaNode);
        if (aIdx !== -1) setCurrentIndex(aIdx);
    }
  }, [selectedNidana, nidana5SubMode, nidanaCycleIndex, activePhase, vithiData.length]);

  useEffect(() => {
    if (selectedNidana !== 7) return;
    if (activePhase !== 'cuti') { setActivePhase('cuti'); return; }
    const avijjaIdx = nidanaViewMode === 'cause' ? 0 : 1;
    const idx = vithiData.findIndex(n => n.isAvijjaNode && n.avijjaIdx === avijjaIdx);
    if (idx !== -1) setCurrentIndex(idx);
  }, [selectedNidana, nidanaViewMode, activePhase, vithiData.length]);

  useEffect(() => {
    if (selectedNidana !== 10 || nidanaViewMode !== 'effect') return;
    const N10_E = ["Lão tử","Sầu","Bi","Khổ","Ưu","Não"];
    const eff = N10_E[nidana10EffectIdx % 6];
    if (eff === 'Lão tử') {
        const idx = vithiData.findIndex(n => n.name === 'Tử tâm');
        if (idx !== -1) setCurrentIndex(idx);
    } else if (['Sầu','Bi','Ưu','Não'].includes(eff)) {
        const idx = vithiData.findIndex(n => n.name === 'Ý môn hướng tâm');
        if (idx !== -1) setCurrentIndex(idx);
    } else if (eff === 'Khổ') {
        const idx = vithiData.findIndex(n => n.name.includes('Thân thức'));
        if (idx !== -1) setCurrentIndex(idx);
    }
  }, [selectedNidana, nidanaViewMode, nidana10EffectIdx, activePhase, activeVithi, vithiData.length]);

  useEffect(() => {
    if (selectedNidana !== 10 || nidanaViewMode !== 'cause' || activePhase !== 'cuti') return;
    const allPat = vithiData.reduce((acc,n,i) => n.name==='Kiết sanh' ? [...acc,i] : acc, []);
    const lastPat = allPat[allPat.length-1];
    if (lastPat !== undefined) setCurrentIndex(lastPat);
  }, [selectedNidana, nidanaViewMode, activePhase, vithiData.length]);

  useEffect(() => {
    if (selectedNidana !== 5 || activePhase !== 'pavatti' || nidana5SubMode !== 'cause') return;
    const N5_SRC2 = ['Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Hữu phần dứt dòng'];
    const tIdx = vithiData.findIndex(n => n.name.includes(N5_SRC2[nidanaCycleIndex % 6]) || n.name === N5_SRC2[nidanaCycleIndex % 6]);
    if (tIdx !== -1) setCurrentIndex(tIdx);
  }, [selectedNidana, activePhase, nidana5SubMode, nidanaCycleIndex, vithiData]);

  useEffect(() => {
      let interval;
      if (isPlaying) {
        interval = setInterval(() => {
          setCurrentIndex((prev) => {
            if (prev >= vithiData.length - 1) { setIsPlaying(false); return prev; }
            return prev + 1;
          });
        }, 1500);
      }
      return () => clearInterval(interval);
  }, [isPlaying, vithiData.length]);

  useEffect(() => {
    if (timelineRef.current && timelineRef.current.children) {
      const nodes = Array.from(timelineRef.current.querySelectorAll('.citta-node'));
      if (nodes[currentIndex]) nodes[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentIndex]);

  useEffect(() => {
    const _VT = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
    const cur = _VT[nidanaCycleIndex % _VT.length];
    const isActive = (selectedNidana === 1 || (selectedNidana === 2 && nidana2SubMode === 'kamma')) && nidanaViewMode === 'effect' && cur === 'Hữu phần';
    if (!isActive || !timelineRef.current) return;
    const patIdx = vithiData.findIndex(n => n.name === 'Kiết sanh');
    const targetIdx = vithiData.findIndex((n, i) => {
        if (!n.isBhavangaNode) return false;
        if (activePhase === 'patisandhi') return patIdx !== -1 && i >= patIdx;
        if (activePhase === 'cuti') return patIdx === -1 || i < patIdx;
        return true;
    });
    if (targetIdx !== -1) setCurrentIndex(targetIdx);
  }, [selectedNidana, nidana2SubMode, nidanaViewMode, nidanaCycleIndex, activePhase, vithiData.length]);

  const activeNode = vithiData[currentIndex] || vithiData[0] || { name: "", cetasikas: [], count: 0, cetasikaOnlyCount: 0 };

  const vipakaKeywords = ["Quả", "Kiết sanh", "Hữu phần", "Tử tâm", "Tiếp thâu", "Quan sát", "Đồng sở duyên",
    "Nhãn thức","Nhĩ thức","Tỷ thức","Thiệt thức","Thân thức"];
  const paticcaNodeName = paticcaLockedNodeData?.name || activeNode.name;
  const isVipaka = [2,3,4,5,6].includes(paticcaKhandha) && vipakaKeywords.some(k => paticcaNodeName.includes(k));

  // --- Calculate Valid Rupas based on Active Node ---
  const validRupas = useMemo(() => {
      const rupas = { kammaja: true, cittaja: true, utuja: true, aharaja: true };
      const name = activeNode?.name || "";
      
      if (activeNode?.base === "Không" && !name.includes("Diệt tận định")) {
          return { kammaja: false, cittaja: false, utuja: false, aharaja: false };
      }

      if (name.includes("Kiết sanh")) rupas.cittaja = false;
      if (["Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức"].some(v => name.includes(v))) rupas.cittaja = false;
      if (name === "Tử tâm" && activePuggalaId.includes('arahant')) rupas.cittaja = false;

      if (activePhase === 'patisandhi' && name.includes("Hữu phần")) {
          rupas.aharaja = false;
      }
      if (activePhase === 'cuti' && name.includes("Kiết sanh")) {
          rupas.aharaja = false;
      }

      return rupas;
  }, [activeNode, activePhase, activePuggalaId]);

  const cittaGroup = (activeNode.cetasikas || []).filter(c => c === "Tâm");
  const vedanaGroup = (activeNode.cetasikas || []).filter(c => c.includes("Thọ"));
  const sannaGroup = (activeNode.cetasikas || []).filter(c => c === "Tưởng");
  const sankharaPrimary = (activeNode.cetasikas || []).filter(c => c === "Tư");
  const sankharaSecondary = (activeNode.cetasikas || []).filter(c => c !== "Tâm" && !c.includes("Thọ") && c !== "Tưởng" && c !== "Tư");

  const CetasikaBtn = ({ cName, label }) => (
      <button 
        onClick={() => setSelectedCetasika(cName)}
        onMouseEnter={() => handleMouseEnter(cName)}
        onMouseLeave={handleMouseLeave}
        className={`px-2 py-1 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-[11px] transition-all duration-200 border cursor-pointer hover:-translate-y-0.5 ${getCetasikaStyle(cName)}`}
      >
        {label || cName}
      </button>
  );

  useEffect(() => {
      if (activeNode?.specificName) {
          setToastMessage(activeNode.specificName.replace(/^[0-9]+\.\s*/, ''));
          const timer = setTimeout(() => setToastMessage(""), 2000);
          return () => clearTimeout(timer);
      } else {
          setToastMessage("");
      }
  }, [currentIndex, activeNode, tadaCycleIndex, lokuttaraJhanaIndex, javanaSubIndex, bhavangaSubIndex, aramQIndex, avijjaState, sankharaState]);

  const handleNext = () => setCurrentIndex(p => Math.min(vithiData.length - 1, p + 1));
  const handlePrev = () => setCurrentIndex(p => Math.max(0, p - 1));
  const handleReset = () => {
    if (activePhase === 'patisandhi') setCurrentIndex(vithiData.findIndex(n => n.name === 'Kiết sanh') || 0);
    else if (activePhase === 'cuti') setCurrentIndex(vithiData.findIndex(n => n.name === 'Tử tâm') || 0);
    else setCurrentIndex(0);
    setIsPlaying(false);
  };
  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleSaveArammana = () => {
      const aramOffset = promptModal.type === 'past_life' ? currentLifeOffset - 1 : promptModal.type === 'future_life' ? currentLifeOffset + 1 : currentLifeOffset;
      if (lifeLocks[aramOffset]) { setPromptModal({isOpen: false, type: '', value: ''}); return; }
      const newArammanas = { ...customArammanas, [promptModal.type]: promptModal.value };
      setCustomArammanas(newArammanas);
      setPromptModal({isOpen: false, type: '', value: ''});
  };

  const currentJavanaGroup = availableJavanaGroups.find(g => g.id === javanaGroupId) || availableJavanaGroups[0] || { options: [] };
  let modalDisplayInfo = null;
  if (selectedCetasika === "Tâm") modalDisplayInfo = getActiveCittaInfo(activeNode.name, currentJavanaGroup.options?.[javanaSubIndex]?.id);
  else if (selectedCetasika) modalDisplayInfo = CETASIKA_DICT[selectedCetasika];
  if (modalDisplayInfo && selectedCetasika === "Tâm" && activeNode.specificName) {
      modalDisplayInfo = { ...modalDisplayInfo, name: activeNode.specificName };
  }

  const rupaBaseData = selectedBaseForModal ? getRupasForBase(selectedBaseForModal) : null;
  const isSpecialArammana = activeNode.aramana && activeNode.aramana !== "Nghiệp/Tướng nghiệp/Tướng thú quá khứ" && activeNode.aramana !== "Cảnh Đổng tốc Cận tử kiếp trước cho kiếp sau" && activeNode.aramana !== "Không" && !activeNode.aramana.includes("Nghiệp");
  const isSpecialBase = activeNode.base && activeNode.base !== "Không" && !activeNode.base.includes("Ý căn");

  let javanaSelectContent;
  if (activePhase === 'patisandhi') {
      javanaSelectContent = <option value="akusala_lobha">Tham tương ưng Tà</option>;
  } else {
      javanaSelectContent = availableJavanaGroups.map(g => (
          <option key={g.id} value={g.id}>{g.label}</option>
      ));
  }

  let activePuggalaLabel = "Chọn Người";
  for(let g of PUGGALA_LIST) {
      const p = g.options.find(o => o.id === activePuggalaId);
      if(p) { activePuggalaLabel = p.label; break; }
  }

  let activeBhavangaLabel = "Chọn Hữu phần";
  for(let g of VIPAKA_GROUPS) {
      if(g.id === bhavangaGroupId) {
          activeBhavangaLabel = g.options[bhavangaSubIndex]?.label || "Hữu phần";
          break;
      }
  }

  let utujaCauseText = "Lửa (Quý) trong Sắc Tứ sinh";
  if (activeNode.name.includes("Kiết sanh")) {
      utujaCauseText = "Lửa (Quý) trong Sắc Nghiệp sinh";
  } else if (activePhase === 'patisandhi' && activeNode.name.includes("Hữu phần")) {
      utujaCauseText = "Lửa (Quý) trong Sắc Tam sinh";
  }

  const isPaticcaActive = paticcaStep > 0;
  const showRupaColumn = true;
  const rupaNode = (isPaticcaActive && paticcaKhandha === 1 && paticcaLockedNodeData)
      ? paticcaLockedNodeData
      : activeNode;
  const isRupaHighlighted = khandhaViewIndex === 1 || isPaticcaActive;
  const preSamphassaLabel =
    ["Hữu phần","Hữu phần rúng động","Hữu phần dứt dòng","Hữu phần vừa qua","Tử tâm","Kiết sanh"].some(n =>
        (paticcaLockedNodeData?.name || activeNode.name) === n)
    ? "Ý Xúc quá khứ (Ý môn)"
    : "Ý Xúc quá khứ";
  const rupaBoxStyle = (isPaticcaActive && paticcaKhandha === 1)
      ? 'ring-[3px] ring-amber-500 bg-amber-50 shadow-2xl border-transparent z-10 scale-[1.03]' 
      : (khandhaViewIndex === 1 ? 'ring-[3px] ring-indigo-500 bg-indigo-50 shadow-xl border-transparent z-10 scale-[1.02]' : 'shadow-sm bg-white border-slate-200');

  const getRupaBadgeStyle = (rupaType) => {
      let baseStyle = "text-[8px] md:text-[9px] px-2 py-1 rounded font-bold border transition-all duration-500 ";

      let isValid = true;
      if (rupaType === "Sắc Nghiệp sinh") isValid = validRupas.kammaja;
      if (rupaType === "Sắc Tâm sinh") isValid = validRupas.cittaja;
      if (rupaType === "Sắc Quý sinh") isValid = validRupas.utuja;
      if (rupaType === "Sắc Vật thực sinh") isValid = validRupas.aharaja;

      if (!isValid) {
          return baseStyle + "bg-slate-100 text-slate-300 border-slate-200 opacity-40 line-through";
      }

      if (paticcaKhandha !== 1 && paticcaStep > 0) {
          if (rupaType === "Sắc Nghiệp sinh") return baseStyle + "bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm";
          if (rupaType === "Sắc Tâm sinh") return baseStyle + "bg-blue-100 text-blue-800 border-blue-200 shadow-sm";
          if (rupaType === "Sắc Quý sinh") return baseStyle + "bg-orange-100 text-orange-800 border-orange-200 shadow-sm";
          if (rupaType === "Sắc Vật thực sinh") return baseStyle + "bg-rose-100 text-rose-800 border-rose-200 shadow-sm";
      }
      if (paticcaStep === 0) {
          if (rupaType === "Sắc Nghiệp sinh") return baseStyle + "bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm";
          if (rupaType === "Sắc Tâm sinh") return baseStyle + "bg-blue-100 text-blue-800 border-blue-200 shadow-sm";
          if (rupaType === "Sắc Quý sinh") return baseStyle + "bg-orange-100 text-orange-800 border-orange-200 shadow-sm";
          if (rupaType === "Sắc Vật thực sinh") return baseStyle + "bg-rose-100 text-rose-800 border-rose-200 shadow-sm";
      }

      let isTarget = false;
      let isCause = false;

      if (paticcaStep === 1 && rupaType === "Sắc Nghiệp sinh") isTarget = true;
      if (paticcaStep === 2 && rupaType === "Sắc Nghiệp sinh") isTarget = true;
      if (paticcaStep === 3 && rupaType === "Sắc Tâm sinh") isTarget = true;
      
      if (paticcaStep === 4) {
          isCause = true;
          if (rupaType === "Sắc Quý sinh") { isTarget = true; isCause = false; }
      }
      if (paticcaStep === 5) {
          isCause = true;
          if (rupaType === "Sắc Vật thực sinh") { isTarget = true; isCause = false; }
      }

      if (isTarget) {
          if (rupaType === "Sắc Nghiệp sinh") return baseStyle + "bg-emerald-500 text-white ring-[3px] ring-offset-1 ring-emerald-300 scale-[1.15] animate-pulse shadow-lg z-10";
          if (rupaType === "Sắc Tâm sinh") return baseStyle + "bg-blue-500 text-white ring-[3px] ring-offset-1 ring-blue-300 scale-[1.15] animate-pulse shadow-lg z-10";
          if (rupaType === "Sắc Quý sinh") return baseStyle + "bg-orange-500 text-white ring-[3px] ring-offset-1 ring-orange-300 scale-[1.15] animate-pulse shadow-lg z-10";
          if (rupaType === "Sắc Vật thực sinh") return baseStyle + "bg-rose-500 text-white ring-[3px] ring-offset-1 ring-rose-300 scale-[1.15] animate-pulse shadow-lg z-10";
      }
      
      if (isCause) {
          return baseStyle + "bg-slate-100 text-slate-600 border-dashed border-slate-400 opacity-80 shadow-sm";
      }
      
      return baseStyle + "bg-slate-100 text-slate-400 border-slate-200 opacity-40 grayscale";
  };

  const displayLifeOffset = (() => {
      const dIdx = vithiData.findIndex(n => n.isLifeDividerBefore);
      if (dIdx !== -1) {
          if (activePhase === 'patisandhi' && currentIndex < dIdx) return currentLifeOffset - 1;
          if (activePhase === 'cuti' && currentIndex >= dIdx) return currentLifeOffset + 1;
      }
      return currentLifeOffset;
  })();

  const isPaticcaActiveInRender = paticcaStep > 0;
  const rupaNodeInRender = (isPaticcaActiveInRender && paticcaKhandha === 1 && paticcaLockedNodeData)
      ? paticcaLockedNodeData
      : activeNode;

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 p-2 md:p-4 flex justify-center items-center font-sans text-slate-800">
      <div className="max-w-6xl w-full h-full flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 relative">
        
        {/* Full Screen Overlay for Dropdowns */}
        {(showPuggalaMenu || showBhavangaMenu) && (
            <div className="fixed inset-0 z-40" onClick={() => { setShowPuggalaMenu(false); setShowBhavangaMenu(false); }}></div>
        )}

        {/* --- Life Timeline Header --- */}
        <div className="shrink-0 bg-slate-900 px-4 py-2 flex justify-between items-center text-slate-300 z-30">
           <button onClick={() => {setCurrentLifeOffset(p=>p-1); setCurrentIndex(0); setIsPlaying(false);}} className="hover:text-white flex gap-1 items-center px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 transition">
             <ChevronLeft className="w-4 h-4"/> <span className="text-xs">{getLifeName(displayLifeOffset - 1)}</span>
           </button>
           <div className="flex items-center gap-2 relative">
               <div className="font-black text-emerald-400 text-base md:text-lg tracking-wide px-2 text-center">
                   {getLifeName(displayLifeOffset)}
               </div>
               <button 
                  onClick={() => toggleLifeLock(currentLifeOffset)} 
                  className={`p-1.5 rounded-md transition-colors ${isLifeLocked ? 'text-rose-400 bg-rose-900/50 hover:bg-rose-900' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  title={isLifeLocked ? "Khóa thay đổi hạng người cho kiếp này" : "Mở khóa thay đổi hạng người"}
               >
                  {isLifeLocked ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}
               </button>
           </div>
           <button onClick={() => {setCurrentLifeOffset(p=>p+1); setCurrentIndex(0); setIsPlaying(false);}} className="hover:text-white flex gap-1 items-center px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 transition">
             <span className="text-xs">{getLifeName(displayLifeOffset + 1)}</span> <ChevronRight className="w-4 h-4"/>
           </button>
        </div>

        {/* --- Phase Tabs --- */}
        <div className="shrink-0 bg-slate-800 p-2 flex justify-center items-center border-t border-slate-700 z-50 relative">
          <div className="flex bg-slate-700 rounded-xl p-1 gap-1 max-w-md w-full">
            {PHASES.map((phase) => (
              <button
                key={phase.id}
                onClick={() => { setActivePhase(phase.id); setIsPlaying(false); setPaticcaStep(0); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  ((() => { const ep = (activeNode.isAvijjaNode || activeNode.isSankharaNode) ? 'pavatti' : activeNode.name === 'Kiết sanh' ? 'patisandhi' : activePhase; return ep === phase.id; })())
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-600'
                }`}
              >
                <Clock className="w-3 h-3" />
                {phase.label}
              </button>
            ))}
          </div>
          
          <div className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <div className="relative flex flex-col items-center">
              <button
                onClick={() => {
                  if (selectedNidana !== null) {
                    setSelectedNidana(null); setNidanaViewMode('cause');
                    setNidanaCycleIndex(0); setNidana2SubMode(null);
                    setNidana3SubMode(null);
                    setNidana5SubMode('cause');
                  } else { setShowNidanaMenu(v => !v); }
                }}
                className="p-1.5 md:p-2 rounded-full bg-slate-700 text-cyan-400 hover:bg-slate-600 shadow-md transition-all"
                title="Duyên Khởi Phương Pháp 1"
              >
                <Layers className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              
              {selectedNidana !== null && (
                  <div className="absolute top-full mt-1 px-2 py-0.5 bg-cyan-800 text-cyan-100 text-[9px] md:text-[10px] font-bold rounded shadow-md whitespace-nowrap z-50 pointer-events-none">
                      {NIDANA_LIST[selectedNidana]}
                  </div>
              )}

              {showNidanaMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNidanaMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-[320px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                    <div className="bg-cyan-700 text-white px-4 py-2 font-bold text-sm">
                      Duyên Khởi Phương Pháp 1
                    </div>
                    <div className="overflow-y-auto max-h-[60vh]">
                      {NIDANA_LIST.map((pali, i) => (
                        <div key={i}
                          className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 cursor-pointer transition-colors
                            ${selectedNidana === i ? 'bg-cyan-100 border-l-4 border-l-cyan-500' : (i % 2 === 0 ? 'bg-slate-50 hover:bg-cyan-50' : 'bg-white hover:bg-cyan-50')}`}
                          onClick={() => { setSelectedNidana(i); setNidanaViewMode('cause'); setNidanaCycleIndex(0); setNidana4CycleIdx(0); setNidana2SubMode(null); setNidana10EffectIdx(0); setNidana10BaseOffset(currentLifeOffset); setShowNidanaMenu(false); if (i === 5 || i === 6) { if (activePhase !== 'pavatti') setActivePhase('pavatti'); setActiveVithi('cakkhu'); setNidana5SubMode('cause'); } if (i === 7) { setActivePhase('cuti'); setNidanaViewMode('cause'); } if (i === 8) { setActivePhase('cuti'); setNidanaViewMode('cause'); } if (i === 10) { setActivePhase('cuti'); } }}
                        >
                          <span className="text-cyan-600 font-black text-xs w-5 shrink-0">{toMyanmarNum(i + 1)}</span>
                          <span className={`text-xs font-medium leading-snug ${selectedNidana === i ? 'text-cyan-800 font-bold' : 'text-slate-800'}`}>{pali}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* --- Filters Area --- */}
        <div className="shrink-0 bg-slate-100 p-3 md:p-4 border-b border-slate-200 flex flex-col items-center relative z-40">
          <div className="absolute top-2 left-2 md:top-4 md:left-4 z-50 flex items-center">
             <div className="relative">
                 <div 
                    onClick={() => { if(!isLifeLocked) setShowPuggalaMenu(!showPuggalaMenu) }}
                    className={`pl-2.5 pr-6 py-1.5 rounded-lg text-[10px] md:text-xs font-black shadow-md flex items-center gap-1.5 transition-colors border ${isLifeLocked ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-800 border-slate-300 cursor-pointer hover:shadow-lg'}`}
                 >
                    <User className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isLifeLocked ? 'text-slate-400' : 'text-indigo-600'}`} />
                    <span>{activePuggalaLabel}</span>
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {showPuggalaMenu ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4 text-indigo-500" /> : <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-slate-500" />}
                    </div>
                 </div>

                 {showPuggalaMenu && (
                     <div className="absolute top-full left-0 mt-1 w-[280px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[60vh]">
                         <div className="overflow-y-auto">
                             {PUGGALA_LIST.map((g, i) => (
                                 <div key={i}>
                                     <div 
                                        className={`px-3 py-2.5 font-bold cursor-pointer transition-colors border-b border-slate-100 flex items-center justify-between ${expandedPuggalaGroup === i ? g.colorClass : 'text-slate-700 bg-slate-50 hover:bg-slate-100'}`}
                                        onClick={() => setExpandedPuggalaGroup(expandedPuggalaGroup === i ? null : i)}
                                     >
                                         <span className="text-xs md:text-sm">{g.group}</span>
                                         {expandedPuggalaGroup === i ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                     </div>
                                     {expandedPuggalaGroup === i && (
                                         <div className="bg-white flex flex-col py-1">
                                             {g.options.map(p => (
                                                 <div 
                                                    key={p.id}
                                                    className={`px-4 py-2 text-xs md:text-sm cursor-pointer transition-colors ${activePuggalaId === p.id ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-500' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border-l-4 border-transparent'}`}
                                                    onClick={() => {
                                                        handlePuggalaChange(p.id);
                                                        setShowPuggalaMenu(false);
                                                    }}
                                                 >
                                                     {p.label}
                                                </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
             </div>
          </div>

          <div className="flex flex-wrap justify-center items-end gap-4 md:gap-6 w-full max-w-5xl pt-10 md:pt-0">
            {activePhase === 'pavatti' ? (
                <>
                    <div className="flex flex-col gap-1.5 relative">
                      <label className="text-slate-600 font-bold text-xs uppercase tracking-wider text-center">
                        Loại Lộ Tâm (Vīthi)
                      </label>
                      <div className="flex gap-1.5 justify-center">
                        <select
                          value={activeVithi}
                          onChange={handleVithiChange}
                          className="w-auto px-3 py-1.5 rounded-lg font-medium text-xs border border-slate-300 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          {availableVithis.map((group, idx) => (
                            <optgroup key={idx} label={group.group}>
                              {group.options.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {(['cakkhu', 'sota', 'ghana', 'jivha', 'kaya'].includes(activeVithi)) && (
                          <button onClick={() => {setPancaDvaraVariation(p=>(p+1)%15); setCurrentIndex(0); setIsPlaying(false);}} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1.5 rounded-lg border border-indigo-300 flex items-center transition-colors shadow-sm" title="15 Lộ Ngũ môn">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                        {activeVithi === 'mano_kama' && (
                          <button onClick={() => {setManoKamaVariation(p=>(p+1)%4); setCurrentIndex(0); setIsPlaying(false);}} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1.5 rounded-lg border border-indigo-300 flex items-center transition-colors shadow-sm" title="4 Lộ Ý môn">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                        {(activeVithi.includes('appana') && activeVithi !== 'appana_adhit') && (
                          <button onClick={() => {setAppanaVariation(p=>(p+1)%2); setCurrentIndex(0); setIsPlaying(false);}} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1.5 rounded-lg border border-indigo-300 flex items-center transition-colors shadow-sm" title="Lợi trí & Độn trí">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 relative">
                      <label className="text-slate-600 font-bold text-xs uppercase tracking-wider text-center flex justify-center">
                        <span>
                            {(activeVithi === 'appana_magga' || activeVithi === 'appana_phala' || activeVithi === 'appana_nirodha') ? "26 Đổng tốc An chỉ" : 
                             (activeVithi === 'appana_abhinna') ? "26 Đổng tốc An chỉ" : 
                             (activeVithi === 'appana_jhana_1' || activeVithi === 'appana_jhana_later') ? "26 Đổng tốc An chỉ" : "29 Đổng tốc Dục giới"}
                        </span>
                      </label>
                      <div className="flex gap-1.5 justify-center">
                        <select
                          value={javanaGroupId}
                          onChange={handleJavanaGroupChange}
                          className="w-auto px-3 py-1.5 rounded-lg font-medium text-xs border border-slate-300 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-full overflow-hidden text-ellipsis"
                        >
                          {javanaSelectContent}
                        </select>
                      </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col gap-1.5 relative">
                    <label className="text-slate-600 font-bold text-xs uppercase tracking-wider text-center">Đổng tốc lộ Hành</label>
                    <select
                        value={sankharaState.javanaGroupId}
                        onChange={(e) => {
                            const val = e.target.value;
                            const offset = activePhase === 'cuti' ? currentLifeOffset : currentLifeOffset - 1;
                            if (lifeLocks[offset]) return;
                            const cur = getSankharaState(offset);
                            const isJhana = val.includes('jhana');
                            setSankharaStateByLife(prev => ({
                                ...prev,
                                [offset]: {
                                    ...cur,
                                    javanaGroupId: val,
                                    vara: isJhana ? 2 : (cur.vara === 2 ? 0 : cur.vara),
                                    javanaIdx: 0
                                }
                            }));
                            setIsPlaying(false);
                        }}
                        className="w-auto px-3 py-1.5 rounded-lg font-medium text-xs border border-slate-300 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        <option value="kama_kusala">Đại Thiện (8 loại)</option>
                        <option value="akusala_lobha">Tham căn (8 loại)</option>
                        <option value="akusala_dosa">Sân căn (2 loại)</option>
                        <option value="akusala_moha">Si căn (2 loại)</option>
                        <option value="rupa_jhana_kusala">Thiện Sắc giới (5 loại)</option>
                        <option value="arupa_jhana_kusala">Thiện Vô Sắc giới (4 loại)</option>
                    </select>
                </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-600 font-bold text-xs uppercase tracking-wider text-center">19 Tâm Kiết sanh/Hữu phần/Tử</label>
              <div className="flex gap-1.5 justify-center items-center bg-white rounded-lg p-0.5 border border-slate-300 shadow-sm relative z-40">
                
                {/* Bhavanga Custom Dropdown Trigger */}
                <div 
                   className={`relative px-2 py-1 rounded-md text-xs font-medium cursor-pointer flex items-center justify-between min-w-[140px] ${isBhavangaAuto ? 'opacity-60 cursor-not-allowed text-slate-700' : 'hover:bg-slate-50 text-indigo-700'}`}
                   onClick={() => { if(!isBhavangaAuto) setShowBhavangaMenu(!showBhavangaMenu) }}
                >
                   <span className="truncate max-w-[150px]">{activeBhavangaLabel}</span>
                   {showBhavangaMenu ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                </div>

                {/* Bhavanga Custom Dropdown Menu */}
                {showBhavangaMenu && (
                     <div className="absolute top-full left-0 mt-2 w-[320px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[60vh] z-50">
                         <div className="overflow-y-auto">
                             {VIPAKA_GROUPS.map((g, i) => (
                                 <div key={g.id}>
                                     <div 
                                        className={`px-3 py-2.5 font-bold cursor-pointer transition-colors border-b border-slate-100 flex items-center justify-between ${expandedBhavangaGroup === i ? g.colorClass : 'text-slate-700 bg-slate-50 hover:bg-slate-100'}`}
                                        onClick={() => setExpandedBhavangaGroup(expandedBhavangaGroup === i ? null : i)}
                                     >
                                         <span className="text-xs md:text-sm">{g.label}</span>
                                         {expandedBhavangaGroup === i ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                                     </div>
                                     {expandedBhavangaGroup === i && (
                                         <div className="bg-white flex flex-col py-1">
                                             {g.options.map((opt, optIdx) => {
                                                 const isSelected = bhavangaGroupId === g.id && bhavangaSubIndex === optIdx;
                                                 return (
                                                     <div 
                                                        key={opt.id}
                                                        className={`px-4 py-2 text-xs md:text-sm cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-500' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border-l-4 border-transparent'}`}
                                                        onClick={() => handleBhavangaSelect(g.id, optIdx)}
                                                     >
                                                         {opt.label}
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}

                <div className="w-px h-5 bg-slate-200"></div>
                <button 
                  onClick={() => {
                      const newAuto = !isBhavangaAuto;
                      setIsBhavangaAuto(newAuto);
                      if (newAuto) setBhavangaById(getDefaultBhavanga(activePuggalaId));
                  }}
                  className={`p-1.5 rounded-md transition-colors ${isBhavangaAuto ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                  title={isBhavangaAuto ? "Tự động thiết lập dựa vào hạng người" : "Tùy chọn thủ công"}
                >
                  {isBhavangaAuto ? <Lock className="w-3.5 h-3.5"/> : <Unlock className="w-3.5 h-3.5"/>}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* --- Timeline Header (Dynamic) --- */}
        <div className="shrink-0 bg-slate-50 border-b border-slate-200 flex flex-col items-center justify-center py-2 md:py-3 transition-all min-h-[50px] z-20 relative">
            {selectedNidana !== null ? (
        <div className="w-full max-w-2xl px-4 animate-in fade-in zoom-in duration-300 flex flex-col items-center">
          <h4 className="text-cyan-600 font-black text-xs md:text-sm uppercase tracking-widest bg-cyan-100 px-3 py-1 rounded-full mb-1 border border-cyan-200 shadow-sm">Duyên Khởi Phương Pháp 1</h4>
          </div>
    ) : paticcaStep > 0 ? (
        <div className="w-full max-w-2xl px-4 animate-in fade-in zoom-in duration-300 flex flex-col items-center">
           <h4 className="text-amber-600 font-black text-xs md:text-sm uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-full mb-1 border border-amber-200 shadow-sm">Duyên Khởi Phương Pháp 5</h4>
                   <p className="text-amber-800 text-sm md:text-base font-bold text-center">
                      {paticcaKhandha === 5 ? (
                        <>
                          <>
                            {isVipaka && paticcaStep === 1 && ""}
                            {isVipaka && paticcaStep === 2 && ""}
                            {paticcaStep === 3 && ""}
                            {paticcaStep === 4 && ""}
                            {paticcaStep === 6 && ""}
                            {paticcaStep === 8 && ""}
                            {paticcaStep === 9 && ""}
                            </>
                        </>
                      ) : paticcaKhandha === 1 ? (
        <>
          {paticcaStep === 1 && ""}
          {paticcaStep === 2 && ""}
          {paticcaStep === 3 && ""}
          {paticcaStep === 4 && ``}
          {paticcaStep === 5 && ""}
        </>
      ) : (
        <>
          {(() => {
            const kLabel = paticcaKhandha === 2 ? "Thọ uẩn" : paticcaKhandha === 3 ? "Tưởng uẩn" : "Hành uẩn";
            return <>
              {isVipaka && paticcaStep === 1 && `Vô minh, Ái, Thủ quá khứ tạo tác nhân duyên phát sinh cho ${kLabel} quả hiện tại`}
              {isVipaka && paticcaStep === 2 && `Hành, Nghiệp quá khứ làm phát sinh quả báo ${kLabel} hiện tại`}
              {paticcaStep === 3 && `Danh uẩn hiện tại (${kLabel}) đồng sinh cùng Thức uẩn tương ứng`}
              {paticcaStep === 4 && `Danh uẩn hiện tại (${kLabel}) sanh khởi nương vào các Sắc Ý căn nương tựa tương ứng`}
              {paticcaStep === 5 && `Danh uẩn hiện tại (${kLabel}) sanh khởi nương vào vai trò kết nối trực tiếp của Tâm sở Xúc`}
              {paticcaStep === 7 && `Lộ ngũ môn thức (${kLabel}) hoạt động cần có đầy đủ điều kiện ánh sáng, không gian vật lý tương ứng`}
              {paticcaStep === 8 && `Danh uẩn hiện tại (${kLabel}) hướng vào cảnh hoàn hảo thông qua trạng thái tác ý dẫn dắt`}
              {paticcaStep === 9 && `Lộ ngũ môn thức (${kLabel}) sanh khởi trực tiếp dựa vào sức va chạm của Ngũ xúc tương ứng`}
            </>;
          })()}
        </>
      )}
                   </p>
                </div>
            ) : (
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center whitespace-pre-line leading-tight">
                  {activeNode.vithi}
                  {activePhase === 'pavatti' && (['cakkhu', 'sota', 'ghana', 'jivha', 'kaya'].includes(activeVithi)) && <span className="block mt-0.5 text-indigo-500 font-semibold">{PD_LABELS[pancaDvaraVariation]}</span>}
                  {activePhase === 'pavatti' && activeVithi === 'mano_kama' && <span className="block mt-0.5 text-indigo-500 font-semibold">{MK_LABELS[manoKamaVariation]}</span>}
                  {activePhase === 'pavatti' && (activeVithi.includes('appana') && activeVithi !== 'appana_adhit') && <span className="block mt-0.5 text-indigo-500 font-semibold">{AP_LABELS[appanaVariation]}</span>}
                </h3>
            )}
        </div>

        {/* --- Timeline --- */}
        <div className="shrink-0 bg-white border-b border-slate-200 relative z-10">
          <div 
            ref={timelineRef}
            className="flex items-end gap-0 overflow-x-auto pb-4 pt-4 px-4 md:px-12 snap-x scrollbar-hide min-h-[90px] md:min-h-[110px]"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="w-[10vw] shrink-0"></div>
            {vithiData.map((node, idx) => {
              const isActive = currentIndex === idx;
              const { bg } = getCittaColor(node.name, node.isAvijjaNode ? 'akusala_lobha' : (node.isSankharaNode ? sankharaState.javanaGroupId : (currentJavanaGroup.options?.[javanaSubIndex]?.id || 'k1')));

              let shortName = node.name;
              let numPrefix = "";
              const match = node.name.match(/^([0-9]+)\s*-\s*(.*)/);
              if (match) {
                  numPrefix = match[1];
                  shortName = match[2];
              }

              let tooltipText = "";
              if (node.promptType) tooltipText = "Nhấp đúp chuột để chỉnh sửa cảnh";
              else if (node.isCutiNode) tooltipText = "Nhấp chuột để thay đổi lộ cận tử";
              else if (node.specificName) tooltipText = `${node.specificName}`;
             
             const nidanaHlType = (() => {
  if (selectedNidana === null) return null;
  if (selectedNidana === 0) {
    if (nidanaViewMode === 'cause' && node.isAvijjaNode) return 'cause';
    if (nidanaViewMode === 'effect' && node.isSankharaNode) return 'effect';
  }
  if (selectedNidana === 1) {
    if (nidanaViewMode === 'cause' && node.isSankharaNode) return 'cause';
    if (nidanaViewMode === 'effect') {
      const _VT=['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
const cur = _VT[nidanaCycleIndex % _VT.length];
      if (node.name === cur || node.name.includes(cur)) {
        if (cur === 'Hữu phần') {
    if (!node.isBhavangaNode) return null;
    const patIdx = vithiData.findIndex(n => n.name === 'Kiết sanh');
    if (activePhase === 'patisandhi') return (patIdx !== -1 && idx >= patIdx) ? 'effect' : null;
    if (activePhase === 'cuti') return (patIdx === -1 || idx < patIdx) ? 'effect' : null;
    return 'effect';
} else { return 'effect'; }
      }
    }
  }
  const _VCYC = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
  if (selectedNidana === 2 && nidana2SubMode === 'kamma') {
    if (nidanaViewMode === 'cause' && node.isSankharaNode) return 'cause';
    if (nidanaViewMode === 'effect') {
      const cur = _VCYC[nidanaCycleIndex % _VCYC.length];
      if (node.name === cur || node.name.includes(cur)) {
        if (cur === 'Hữu phần') {
    if (!node.isBhavangaNode) return null;
    const patIdx = vithiData.findIndex(n => n.name === 'Kiết sanh');
    if (activePhase === 'patisandhi') return (patIdx !== -1 && idx >= patIdx) ? 'effect' : null;
    if (activePhase === 'cuti') return (patIdx === -1 || idx < patIdx) ? 'effect' : null;
    return 'effect';
} else { return 'effect'; }
      }
    }
  }
  if ((selectedNidana === 2 && nidana2SubMode === 'sahajata') || (selectedNidana === 3 && nidana3SubMode === 'nama_mana')) {
    if (idx === currentIndex) return 'cause';
  }
  if (selectedNidana === 5) {
    const N5_SRC = ['Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Hữu phần dứt dòng'];
    const N5_PV = ['Nhãn môn lộ tâm','Nhĩ môn lộ tâm','Tỷ môn lộ tâm','Thiệt môn lộ tâm','Thân môn lộ tâm'];
    const _ci5 = nidanaCycleIndex % 6;
    if (nidana5SubMode === 'cause') {
      if (node.name.includes(N5_SRC[_ci5]) || node.name === N5_SRC[_ci5]) return 'cause';
    }
    if (nidana5SubMode === 'effect') {
      if (_ci5 < 5) {
        const _inV = node.vithi?.includes(N5_PV[_ci5]);
        const _isVin = node.name.includes(N5_SRC[_ci5]);
        const _isMano = node.vithi?.includes('Ý môn') || node.vithi?.includes('Bắt cảnh');
        if ((_inV && !_isVin) || _isMano) return 'effect';
      } else {
        const _upIdx = vithiData.findIndex(n => n.name === 'Hữu phần dứt dòng');
        if (_upIdx !== -1 && idx > _upIdx && (node.vithi?.includes('Ý môn') || node.vithi?.includes('Bắt cảnh'))) return 'effect';
      }
    }
  }
  if (selectedNidana === 3 && nidana3SubMode === 'nama_rupa_ay') {
  if (idx === currentIndex) return 'cause';
  if (idx === currentIndex - 1 && currentIndex - 1 >= 0) return 'effect';
}
  if (selectedNidana === 3 && (nidana3SubMode === 'rupa_mana' || nidana3SubMode === 'namarupa_mana')) {
    const _cutiIdx = vithiData.findIndex(n => n.name === "Tử tâm");
    if (idx === currentIndex) return 'effect';
    const curName = vithiData[currentIndex]?.name || "";
    const isPVin = ["Nhãn thức","Nhĩ thức","Tỷ thức","Thiệt thức","Thân thức"].some(v => curName.includes(v));
    if (isPVin) {
        let atitaIdx = -1;
        for (let i = currentIndex - 1; i >= 0; i--) {
            if (vithiData[i]?.name === "Hữu phần vừa qua") { atitaIdx = i; break; }
        }
        if (atitaIdx !== -1 && idx === atitaIdx) return 'cause';
    } else {
        const _curName2 = vithiData[currentIndex]?.name || "";
        if (_curName2 === "Kiết sanh") {
            // Kiết sanh = ကမ္မဇရုပ်သာ မှီ၊ ရှေ့ပြောင်းစိတ် မရှိ၊ highlight မပြ
        } else {
            const _cutiIdx2 = vithiData.findIndex(n => n.name === "Tử tâm");
            if (_cutiIdx2 !== -1 && currentIndex >= _cutiIdx2 - 16 && currentIndex <= _cutiIdx2) {
                if (idx === _cutiIdx2 - 17) return 'cause';
            } else {
                if (currentIndex - 1 >= 0 && idx === currentIndex - 1) return 'cause';
            }
        }
    }
}
if (selectedNidana === 4) {
    if (idx === currentIndex) return 'effect';
  }
  if (selectedNidana === 6) {
    const N6_PV = ['Nhãn môn lộ tâm','Nhĩ môn lộ tâm','Tỷ môn lộ tâm','Thiệt môn lộ tâm','Thân môn lộ tâm'];
    const N6_SRC = ['Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Hữu phần dứt dòng'];
    const _ci6 = nidanaCycleIndex % 6;
    if (nidana5SubMode === 'cause') {
      if (_ci6 < 5) {
        const _inV = node.vithi?.includes(N6_PV[_ci6]);
        const _isVin = node.name.includes(N6_SRC[_ci6]);
        const _isMano = node.vithi?.includes('Ý môn') || node.vithi?.includes('Bắt cảnh');
        if ((_inV && !_isVin) || _isMano) return 'cause';
      } else {
        const _upIdx6 = vithiData.findIndex(n => n.name === 'Hữu phần dứt dòng');
        if (_upIdx6 !== -1 && idx > _upIdx6 && (node.vithi?.includes('Ý môn') || node.vithi?.includes('Bắt cảnh'))) return 'cause';
      }
    }
    if (nidana5SubMode === 'effect') {
      if (node.isAvijjaNode && node.avijjaIdx === 0) return 'effect';
    }
  }
  if (selectedNidana === 7) {
    if (nidanaViewMode === 'cause' && node.isAvijjaNode && node.avijjaIdx === 0) return 'cause';
    if (nidanaViewMode === 'effect' && node.isAvijjaNode && node.avijjaIdx === 1) return 'effect';
  }
  if (selectedNidana === 8) {
  if (nidana4CycleIdx === 0) {
    if (nidanaViewMode === 'cause' && node.isAvijjaNode && node.avijjaIdx === 1) return 'cause';
    if (nidanaViewMode === 'effect' && node.isSankharaNode) return 'effect';
  } else {
    if (nidanaViewMode === 'cause' && node.isSankharaNode) return 'cause';
    if (nidanaViewMode === 'effect' && node.name === 'Kiết sanh') return 'effect';
  }
}
if (selectedNidana === 9) {
  if (selectedNidana === 10) {
  const N10_EFFECTS = ["Lão tử","Sầu","Bi","Khổ","Ưu","Não"];
  const curEff = N10_EFFECTS[nidana10EffectIdx % 6];
  if (nidanaViewMode === 'cause') {
    const allPat = vithiData.reduce((acc,n,i)=>n.name==='Kiết sanh'?[...acc,i]:acc,[]);
    const lastPat = allPat[allPat.length-1];
    if (lastPat !== undefined && idx === lastPat) return 'cause';
  }
  if (nidanaViewMode === 'effect') {
    if (curEff === 'Lão tử' && node.name === 'Tử tâm') return 'effect';
    if (['Sầu','Bi','Ưu','Não'].includes(curEff) && node.isJavanaNode && node.vithi?.includes('Ý môn')) return 'effect';
    if (curEff === 'Khổ' && node.name.includes('Thân thức')) return 'effect';
  }
}
  if (nidanaViewMode === 'cause' && node.isSankharaNode) return 'cause';
  if (nidanaViewMode === 'effect' && node.name === 'Kiết sanh') return 'effect';
}
if (selectedNidana === 10) {
  const N10_EFFECTS = ["Lão tử","Sầu","Bi","Khổ","Ưu","Não"];
  const curEff = N10_EFFECTS[nidana10EffectIdx % 6];
  if (nidanaViewMode === 'cause') {
    const allPat = vithiData.reduce((acc,n,i)=>n.name==='Kiết sanh'?[...acc,i]:acc,[]);
    const lastPat = allPat[allPat.length-1];
    if (lastPat !== undefined && idx === lastPat) return 'cause';
  }
  if (nidanaViewMode === 'effect') {
    if (curEff === 'Lão tử' && node.name === 'Tử tâm') return 'effect';
    if (['Sầu','Bi','Ưu','Não'].includes(curEff) && node.isJavanaNode && node.vithi?.includes('Ý môn')) return 'effect';
    if (curEff === 'Khổ' && node.name.includes('Thân thức')) return 'effect';
  }
}
})();
              const isPaticcaTarget = (paticcaStep === 1 && node.isAvijjaNode) || 
                        (paticcaStep === 2 && node.isSankharaNode) || 
                        ((paticcaStep === 3 || paticcaStep === 4 || paticcaStep === 5 || paticcaStep === 7) && isActive && paticcaStep !== 0) ||
                        (paticcaStep === 6 && node.isBhavangaNode && isActive) ||
                        (paticcaStep === 8 && isActive) || // မနသိကာရ စိတ်အလုံး
                        (paticcaStep === 9 && isActive) ||   // || ထည့်ပြီး semicolon ဖျက်ပါ
                        (paticcaStep === 10 && isActive);
                                      
              const nidanaHasTargets = selectedNidana !== null && (() => {
  if (selectedNidana === 0) return vithiData.some(n => n.isAvijjaNode || n.isSankharaNode);
  if (selectedNidana === 1) {
    if (nidanaViewMode === 'effect') return true;
    return vithiData.some(n => n.isSankharaNode);
}
  return true;
})();
const nodeOpacity = (selectedNidana !== null && nidanaHasTargets)
  ? (nidanaHlType ? 'opacity-100 grayscale-0 z-30' : 'opacity-20 grayscale')
  : (isActive ? 'z-20 opacity-100 grayscale-0' : node.isBhavangaNode ? 'z-10 opacity-20 grayscale hover:opacity-80 hover:grayscale-0' : 'z-10 opacity-60 grayscale-[30%] hover:opacity-100 hover:grayscale-0');

              let circleStyles = `w-[48px] h-[48px] md:w-[52px] md:h-[52px] rounded-full flex flex-col items-center justify-center shadow-sm border-[2px] transition-all duration-300 relative overflow-hidden ${bg} `;
              
              if (isPaticcaTarget && paticcaStep > 0) {
                  circleStyles += (paticcaStep === 1) ? 'scale-[1.2] ring-[4px] ring-offset-2 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] ' :
                              (paticcaStep === 2) ? 'scale-[1.2] ring-[4px] ring-offset-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)] ' :
                              (paticcaStep === 6) ? 'scale-[1.2] ring-[4px] ring-offset-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)] animate-pulse ' :
                              (paticcaStep === 8) ? 'scale-[1.2] ring-[4px] ring-offset-2 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)] animate-pulse ' :
                              (paticcaStep === 9) ? 'scale-[1.2] ring-[4px] ring-offset-2 ring-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.8)] animate-pulse ' :
                              (paticcaStep === 10) ? 'scale-[1.2] ring-[4px] ring-offset-2 ring-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.8)] animate-pulse ' :
                              'scale-[1.2] ring-[4px] ring-offset-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] ';
              } else if (isActive && paticcaStep === 0) {
                  circleStyles += 'scale-[1.15] ring-2 ring-offset-1 ring-emerald-400 shadow-md ';
              } else {
                  circleStyles += 'scale-100 ';
              }
if (nidanaHlType === 'cause') circleStyles += 'scale-[1.2] ring-[4px] ring-offset-2 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse ';
if (nidanaHlType === 'effect') circleStyles += 'scale-[1.2] ring-[4px] ring-offset-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)] animate-pulse ';
              return (
                <React.Fragment key={node.id}>
                  <div 
                    className={`citta-node snap-center shrink-0 flex flex-col items-center cursor-pointer transition-all duration-300 ease-out w-[52px] md:w-[56px] relative ${nodeOpacity}`}
                    onClick={() => { 
                       setCurrentIndex(idx); 
                       setIsPlaying(false); 
// Cross-life navigation: patisandhi မတိုင်ခင်/ပြီးနောက် node ကို နှိပ်ရင် ဘဝပြောင်းသည်
const dividerIdx = vithiData.findIndex(n => n.isLifeDividerBefore);
if (dividerIdx !== -1) {
    if (activePhase === 'patisandhi' && idx < dividerIdx) {
        setCurrentLifeOffset(p => p - 1);
        setActivePhase('cuti');
        return;
    }
    if (activePhase === 'cuti' && idx >= dividerIdx) {
        setCurrentLifeOffset(p => p + 1);
        setActivePhase('patisandhi');
        return;
    }
}
if (selectedNidana === 1 || (selectedNidana === 2 && (nidana2SubMode === 'kamma' || nidana2SubMode === 'sahajata'))) {
  const VIPAKA_TYPES = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
  const tIdx = VIPAKA_TYPES.findIndex(t => node.name === t || node.name.includes(t));
  if (tIdx !== -1) {
    setNidanaCycleIndex(tIdx);
    if (nidana2SubMode !== 'sahajata') setNidanaViewMode('effect');
    return;
  }
}
                       if (node.promptType) return;

                       if (node.isAvijjaNode) {
    const locked = activePhase === 'cuti' ? lifeLocks[currentLifeOffset] : lifeLocks[currentLifeOffset - 1];
    if (locked) return;
    const savedName = node.name;
    const savedAvijjaIdx = node.avijjaIdx;
    const avijjaOffset = activePhase === 'cuti' ? currentLifeOffset : currentLifeOffset - 1;
                    setAvijjaStateByLife(prev => {
                        const next = { ...getAvijjaState(avijjaOffset) };
        if (node.nodeType === 'vajjana') next.vara = (next.vara + 1) % 2;
        if (node.nodeType === 'javana') next.javanaIdx = (next.javanaIdx + 1) % 4;
        if (node.nodeType === 'tada') next.tadaIdx = (next.tadaIdx + 1) % 11;
        return { ...prev, [avijjaOffset]: next };
                    });
    if (node.nodeType !== 'javana') {
        setTimeout(() => {
            const targetIdx = vithiData.findIndex(n => n.isAvijjaNode && n.nodeType === 'vajjana' && n.avijjaIdx === savedAvijjaIdx);
            if (targetIdx !== -1) {
    const nodes = Array.from(timelineRef.current.querySelectorAll('.citta-node'));
    if (nodes[targetIdx]) nodes[targetIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}
        }, 50);
    }
    return;
}

                       if (node.isSankharaNode) {
    const locked = activePhase === 'cuti' ? lifeLocks[currentLifeOffset] : lifeLocks[currentLifeOffset - 1];
    if (locked) return;
                           const sankharaOffset = activePhase === 'cuti' ? currentLifeOffset : currentLifeOffset - 1;
                           setSankharaStateByLife(prev => {
                               const next = { ...getSankharaState(sankharaOffset) };
                               if (node.nodeType === 'vajjana') {
                                   next.vara = (next.vara + 1) % 3;
                                   if (next.vara === 2 && !next.javanaGroupId.includes('jhana')) {
                                       next.javanaGroupId = 'rupa_jhana_kusala';
                                       next.javanaIdx = 0;
                                   } else if (next.vara !== 2 && next.javanaGroupId.includes('jhana')) {
                                       next.javanaGroupId = 'kama_kusala';
                                       next.javanaIdx = 0;
                                   }
                               } else if (node.nodeType === 'javana') {
                                   next.javanaIdx = (next.javanaIdx + 1) % 4;
                               } else if (node.nodeType === 'tada') {
                                   next.aramQIndex = next.aramQIndex === 0 ? 1 : (next.aramQIndex === 1 ? 3 : 0);
                                   next.tadaIdx = next.tadaIdx + 1;
                               }
                               return { ...prev, [sankharaOffset]: next };
                           });
                           return;
                       }

                       if (node.isTadarammana && !node.isMaranaNode) {
                           setTadaCycleIndex(p => p + 1);
                       } else if (['Nhãn thức', 'Nhĩ thức', 'Tỷ thức', 'Thiệt thức', 'Thân thức', 'Tiếp thâu'].includes(node.name)) {
                           setAramQIndex(p => p === 3 ? 1 : 3);
                       } else if (node.name === 'Quan sát') {
                           setAramQIndex(p => {
                               if (p === 3) return 1;
                               if (p === 1 || p === 2) return 0;
                               return 3;
                           });
                       } else if (node.isJavanaNode && !node.isMaranaNode) {
                           setTadaCycleIndex(0);
                           if (javanaGroupId.startsWith('magga_') || javanaGroupId.startsWith('phala_') || javanaGroupId.startsWith('nirodha_')) {
                               setLokuttaraJhanaIndex(p => (p + 1) % 5);
                           } else if (javanaGroupId === 'abhinna_kusala' || javanaGroupId === 'abhinna_kiriya') {
                               // fixed for these or handled differently
                           } else if (javanaGroupId.includes('arupa_jhana')) {
                               setJavanaSubIndex(p => (p + 1) % currentJavanaGroup.options.length);
                           } else if (javanaGroupId.includes('rupa_jhana')) {
                               const valid = getValidJhanaIndices(rupaArammanaIndex);
                               const curr = valid.indexOf(javanaSubIndex);
                               setJavanaSubIndex(valid[(curr + 1) % valid.length]);
                           } else {
                               setJavanaSubIndex(p => (p + 1) % currentJavanaGroup.options.length);
                           }
                           } else if (node.isJavanaNode && node.isMaranaNode) {
    const maranaOffset = activePhase === 'cuti' ? currentLifeOffset : currentLifeOffset - 1;
    const curSankharaState = getSankharaState(maranaOffset);
    const mSGroup = JAVANA_GROUPS.find(g => g.id === curSankharaState.javanaGroupId);
    let mSOpts = getFilteredJavanaOptions(mSGroup.id, activePuggalaId);
    if (!mSOpts || mSOpts.length === 0) mSOpts = mSGroup.options;
    setSankharaStateByLife(prev => ({
        ...prev,
        [maranaOffset]: { ...curSankharaState, javanaIdx: (curSankharaState.javanaIdx + 1) % mSOpts.length }
    }));
} else if (node.isBhavangaNode) {
                           if (!isBhavangaAuto) {
                               const bhvGrp = VIPAKA_GROUPS.find(g => g.id === bhavangaGroupId) || VIPAKA_GROUPS[1];
                               setBhavangaSubIndex(p => (p + 1) % bhvGrp.options.length);
                           }
                       } else if (node.name === "Tử tâm") {
    const locked = activePhase === 'cuti' ? lifeLocks[currentLifeOffset] : lifeLocks[currentLifeOffset - 1];
    if (locked) return;
                           if (node.lifePhase === 'past') setPastCutiVariation(p=>(p+1)%4);
                           else setCutiVariation(p=>(p+1)%4);
                       }
                    }}
                    onDoubleClick={() => {
       if (node.promptType) {
           const aramOffset = node.promptType === 'past_life' ? currentLifeOffset - 1 : node.promptType === 'future_life' ? currentLifeOffset + 1 : currentLifeOffset;
           if (lifeLocks[aramOffset]) return;
           setPromptModal({ isOpen: true, type: node.promptType, value: customArammanas[node.promptType] });
       }
    }}
                    onMouseEnter={() => handleMouseEnter(node.name)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {node.isLifeDividerBefore && (
                       <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-[2px] w-0 h-24 border-l-[4px] border-dashed border-rose-500 z-0 opacity-80"></div>
                    )}

                    {isActive && (
                       <div className="absolute bottom-[75px] flex flex-col items-center justify-center w-max z-30 pointer-events-none drop-shadow-md">
                           <div className="flex flex-row items-center gap-1.5">
                               <div className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-200 whitespace-nowrap shadow-sm">
                                   {node.vithi}
                               </div>
                           </div>
                           <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-indigo-200 mt-1"></div>
                       </div>
                    )}

                    <span className={`text-[9px] mb-0.5 font-bold ${isActive ? 'text-indigo-600 opacity-100' : 'opacity-60 text-slate-500'}`}>
                      {node.displayNum}
                    </span>
                    
                    <div className="w-[52px] h-[52px] md:w-[56px] md:h-[56px] flex items-center justify-center">
                        <div className={circleStyles} title={tooltipText}>
                          {node.isCutiNode && isActive && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                          {node.promptType && isActive && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                          {node.isTadarammana && isActive && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                          {numPrefix && <span className="text-[8px] font-mono opacity-80 mb-0.5">{numPrefix}</span>}
                          <span className="text-[8px] md:text-[9px] font-bold text-center px-0.5 leading-tight break-words">
                            {shortName}
                          </span>
                        </div>
                    </div>

                    <div className="flex gap-0.5 mt-1.5 justify-center bg-slate-50 px-1.5 py-0.5 rounded-full shadow-inner border border-slate-200">
                      <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} title="Sanh"></div>
                      <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} title="Trụ"></div>
                      <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} title="Diệt"></div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div className="w-[10vw] shrink-0"></div>
          </div>
          
          <div className="h-5 flex justify-center items-center mt-1 px-4 border-t border-slate-100 bg-slate-50">
              <span className={`text-[11px] font-bold text-indigo-700 transition-opacity duration-300 ease-in-out truncate ${hoverLakkana ? 'opacity-100' : 'opacity-0'}`}>
                  {hoverLakkana || " "}
              </span>
          </div>
        </div>

        {/* --- Info Area (Scrollable Columns) --- */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-50 relative flex flex-col">
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 p-3 md:p-4 pb-24 md:pb-20 overflow-y-auto">
              <div className={`lg:col-span-1 flex flex-col h-full ${!showRupaColumn ? 'hidden' : ''}`}>
                <div className={`p-4 rounded-xl h-auto flex flex-col justify-start shrink-0 mb-4 lg:mb-0 transition-all duration-300 relative ${rupaBoxStyle}`}>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-bold text-slate-800">
                        {displayMode === 'khandha' ? 'Sắc uẩn' : 'Sắc pháp'}
                    </h3>
                    
                    <button 
                        onClick={() => { setDisplayMode(m => m === 'rupa-nama' ? 'khandha' : m === 'khandha' ? 'ayatana' : m === 'ayatana' ? 'dhatu' : 'rupa-nama'); setKhandhaViewIndex(0); }} 
                        className="p-1.5 bg-indigo-50 border border-indigo-200 rounded shadow-sm hover:bg-indigo-100 transition text-indigo-700 shrink-0"
                        title={displayMode === 'rupa-nama' ? '5 Uẩn (Khandha)' : displayMode === 'khandha' ? '12 Xứ (Āyatana)' : displayMode === 'ayatana' ? '18 Giới (Dhātu)' : 'Sắc Danh (Rūpa-Nāma)'}
                    >
                        <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
    onClick={() => { if (khandhaViewIndex !== 0) handlePaticcaToggle(); }}
    className={`p-1.5 md:p-2 rounded-full transition-all duration-300 shadow-md 
      ${paticcaStep > 0 
        ? 'bg-amber-500 text-white ring-[3px] ring-amber-300 animate-pulse' 
        : 'bg-slate-700 text-amber-400 hover:bg-slate-600'}`}
    title="Duyên Khởi Phương Pháp 5"
  >
    <Share2 className="w-4 h-4 md:w-5 md:h-5" />
  </button>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className={`p-3 rounded-lg border shadow-sm transition-colors duration-300 ${(isPaticcaActive && paticcaKhandha !== 1) ? 'bg-slate-50 border-slate-200' : isSpecialArammana ? 'bg-amber-100 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <p className={`text-[10px] font-bold uppercase ${isSpecialArammana ? 'text-amber-800' : 'text-slate-500'}`}>{displayMode === 'ayatana' ? getAyatanaAramLabel((isPaticcaActive && paticcaLockedNodeData) ? paticcaLockedNodeData.aramana : activeNode.aramana) : displayMode === 'dhatu' ? getDhatuAramLabel((isPaticcaActive && paticcaLockedNodeData) ? paticcaLockedNodeData.aramana : activeNode.aramana) : 'Cảnh'}</p>
                        
                        {(activePhase === 'pavatti' && (['cakkhu', 'sota', 'ghana', 'jivha', 'kaya'].includes(activeVithi) || activeVithi === 'mano_kama')) && (
                          <button onClick={() => { setAramQIndex(p => (p + 1) % 4); setIsPlaying(false); setTadaCycleIndex(0); }} className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold hover:bg-indigo-200 transition shadow-sm" title="Thay đổi cường độ của cảnh">
                              {ARAM_Q_LABELS[aramQIndex]} ⟳
                          </button>
                        )}
                      </div>
                      
                      {activePhase === 'pavatti' && (javanaGroupId.startsWith('rupa_jhana') || javanaGroupId.includes('abhinna')) ? (
                        <select
                          value={rupaArammanaIndex}
                          onChange={(e) => { 
                              const newAramIdx = parseInt(e.target.value);
                              setRupaArammanaIndex(newAramIdx); 
                              const validIndices = getValidJhanaIndices(newAramIdx);
                              if (!validIndices.includes(javanaSubIndex)) {
                                  setJavanaSubIndex(validIndices[0]);
                              }
                              setIsPlaying(false); 
                              setTadaCycleIndex(0); 
                          }}
                          className="w-full mt-1 p-1.5 rounded-md text-[11px] font-semibold border border-indigo-200 bg-indigo-50 text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          {RUPA_ARAMMANA_OPTIONS.map((opt, i) => (
                            <option key={i} value={i}>{opt}</option>
                          ))}
                        </select>
                      ) : activePhase === 'pavatti' && javanaGroupId.includes('arupa_jhana') ? (
                        <select
                          value={javanaSubIndex}
                          onChange={(e) => { 
                              setJavanaSubIndex(parseInt(e.target.value));
                              setIsPlaying(false); 
                              setTadaCycleIndex(0); 
                          }}
                          className="w-full mt-1 p-1.5 rounded-md text-[11px] font-semibold border border-indigo-200 bg-indigo-50 text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          {ARUPA_ARAMMANA_OPTIONS.map((opt, i) => (
                            <option key={i} value={i}>{opt}</option>
                          ))}
                        </select>
                      ) : activePhase === 'pavatti' && activeVithi === 'mano_kama' ? (
                        <select
                          value={selectedArammana}
                          onChange={(e) => { setSelectedArammana(e.target.value); setIsPlaying(false); setTadaCycleIndex(0); }}
                          className="w-full mt-1 p-1.5 rounded-md text-[11px] font-semibold border border-indigo-200 bg-indigo-50 text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          {DHAMMARAMMANA_RUPA.map((group, idx) => (
                            <optgroup key={idx} label={group.group}>
                              {group.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      ) : activePhase === 'pavatti' && activeVithi === 'kaya' ? (
                        <select
                          value={kayaArammanaIndex}
                          onChange={(e) => { setKayaArammanaIndex(parseInt(e.target.value)); setIsPlaying(false); setTadaCycleIndex(0); }}
                          className="w-full mt-1 p-1.5 rounded-md text-[11px] font-semibold border border-indigo-200 bg-indigo-50 text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          {KAYA_ARAMMANA_OPTIONS.map((opt, i) => (
                            <option key={i} value={i}>{opt}</option>
                          ))}
                        </select>
                      ) : selectedNidana === 7 ? (
  <div onClick={() => setNidanaCycleIndex(p => p + 1)}
    className="cursor-pointer mt-1 p-2 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition">
    <p className="font-black text-sm text-amber-900">{['Cảnh sắc','Cảnh thinh','Cảnh hương','Cảnh vị','Cảnh xúc','Cảnh pháp'][nidanaCycleIndex % 6]}</p>
    </div>
) : (
  <p className={`font-bold text-xs mt-1 ${isSpecialArammana ? 'text-amber-900' : 'text-slate-800'}`}>{(isPaticcaActive && paticcaLockedNodeData) ? paticcaLockedNodeData.aramana : activeNode.aramana}</p>
)}
                    </div>
                    
                    <div className={`p-3 rounded-lg border shadow-sm transition-colors duration-300 cursor-pointer hover:opacity-80 flex flex-col items-center sm:items-start ${isSpecialBase ? 'bg-indigo-100 border-indigo-300' : 'bg-slate-50 border-slate-200'}`} onClick={() => {if(rupaNode.base && rupaNode.base !== "Không" && rupaNode.base !== "Không") setSelectedBaseForModal(rupaNode.base)}}>
      <p className={`text-[10px] font-bold uppercase mb-1 ${isSpecialBase ? 'text-indigo-800' : 'text-slate-500'}`}>{displayMode === 'ayatana' ? getAyatanaBaseLabel((isPaticcaActive && paticcaLockedNodeData) ? paticcaLockedNodeData.base : activeNode.base) : displayMode === 'dhatu' ? getDhatuBaseLabel((isPaticcaActive && paticcaLockedNodeData) ? paticcaLockedNodeData.base : activeNode.base) : 'Căn (Vật)'}</p>
      <p className={`font-bold text-xs mt-1 text-center sm:text-left ${rupaNode.base && rupaNode.base !== "Không" && rupaNode.base !== "Không" ? "text-blue-600 underline" : "text-slate-800"}`} title="Nhấn để xem các Bọn sắc">
        {(isPaticcaActive && paticcaLockedNodeData) ? paticcaLockedNodeData.base : activeNode.base}
      </p>
      {rupaNode.base && rupaNode.base !== "Không" && rupaNode.base !== "Không" && (
                         <div className={`flex flex-wrap gap-2 mt-3 justify-center sm:justify-start`}>
                             <span className={getRupaBadgeStyle("Sắc Nghiệp sinh")}>Sắc Nghiệp sinh</span>
                             {activeNode.base !== "Ý căn-30" && activeNode.base !== "Ý căn-30" && (
                                 <>
                                     <span className={getRupaBadgeStyle("Sắc Tâm sinh")}>Sắc Tâm sinh</span>
                                     <span className={getRupaBadgeStyle("Sắc Quý sinh")}>Sắc Quý sinh</span>
                                 </>
                             )}
                             {activeNode.base !== "Ý căn-30" && activeNode.base !== "Ý căn-30" && activeNode.base !== "Ý căn-46" && activeNode.base !== "Ý căn-46" && (
                                 <span className={getRupaBadgeStyle("Sắc Vật thực sinh")}>Sắc Vật thực sinh</span>
                             )}
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 flex flex-col h-full">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full relative shrink-0 flex flex-col">
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-3 border-b border-slate-200 pb-2 relative shrink-0">
                    <div className="flex items-center gap-2">
                      <button 
                          onClick={() => setKhandhaViewIndex(m => m === 0 ? 1 : m >= 5 ? 1 : m + 1)} 
                          className="p-1.5 bg-indigo-50 border border-indigo-200 rounded shadow-sm hover:bg-indigo-100 transition text-indigo-700 shrink-0"
                          title="Nhấn để chuyển đổi 5 uẩn"
                      >
                          <Layers className="w-3.5 h-3.5" />
                      </button>
                      <h3 className="text-sm font-bold text-slate-800 flex flex-wrap items-center gap-2">
                        <span
                        className={(khandhaViewIndex === 4 || khandhaViewIndex === 6) ? 'cursor-pointer hover:text-emerald-600 underline decoration-dashed' : ''}
                        onClick={() => {
                          if (khandhaViewIndex === 4) setKhandhaViewIndex(6);
                          else if (khandhaViewIndex === 6) setKhandhaViewIndex(4);
                        }}
                        title={(khandhaViewIndex === 4 || khandhaViewIndex === 6) ? 'Có thể đổi 2 loại Hành uẩn' : ''}
                      >
                      {(selectedNidana !== null && khandhaViewIndex === 0)
        ? NIDANA_LIST[selectedNidana]
        : khandhaViewIndex === 0
        ? (displayMode === 'khandha' ? '4 Danh uẩn' : 'Danh pháp')
        : khandhaViewIndex === 1 ? 'Sắc uẩn'
        : khandhaViewIndex === 2 ? 'Thọ uẩn'
        : khandhaViewIndex === 3 ? 'Tưởng uẩn'
        : khandhaViewIndex === 4 ? 'Hành uẩn'
        : khandhaViewIndex === 5 ? 'Thức uẩn'
        : 'Hành uẩn (Tư)'}
                      </span>
                        {(selectedNidana !== null && khandhaViewIndex === 0) ? null : khandhaViewIndex === 0 ? (
                            <>
                                <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                                  ({toMyanmarNum(activeNode.count || 0)} loại)
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 ml-1">
                                  [ Tâm (1) + Tâm sở ({toMyanmarNum(activeNode.cetasikaOnlyCount || 0)}) ]
                                </span>
                            </>
                        ) : khandhaViewIndex === 1 ? (
                            <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                                
                            </span>
                        ) : (
                            <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                                ({toMyanmarNum(
                                    khandhaViewIndex === 2 ? vedanaGroup.length :
                                    khandhaViewIndex === 3 ? sannaGroup.length :
                                    khandhaViewIndex === 4 ? sankharaPrimary.length + sankharaSecondary.length :
                            khandhaViewIndex === 5 ? cittaGroup.length :
                            khandhaViewIndex === 6 ? sankharaPrimary.length : 0
                                )} loại)
                            </span>
                        )}
                      </h3>
                    </div>
                    
                    <div className={`absolute left-0 -top-8 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg transition-all duration-300 pointer-events-none z-10 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                      {toastMessage}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 text-[9px] font-bold mt-2 sm:mt-0">
                      <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded">Biến hành</span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">Biệt cảnh</span>
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded">Tịnh quang</span>
                      <span className="px-1.5 py-0.5 bg-orange-50 text-orange-900 border border-dashed border-orange-500 rounded">Bất định</span>
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded">Bất thiện</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2">
                  {(selectedNidana !== null && khandhaViewIndex === 0) ? (() => {
  const VIPAKA_TYPES = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
  if (selectedNidana === 2) {
    const N2_CYCLE = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
  const PVMAP = {'Nhãn thức':'cakkhu','Nhĩ thức':'sota','Tỷ thức':'ghana','Thiệt thức':'jivha','Thân thức':'kaya','Tiếp thâu':'cakkhu','Quan sát':'cakkhu','Đồng sở duyên':'cakkhu'};
  const BASE_K = {'Ý căn-30':30,'Ý căn-46':39,'Ý căn-63':39,'Nhãn căn-63':39,'Nhĩ căn-63':39,'Tỷ căn-63':39,'Thiệt căn-63':39,'Thân căn-53':30};

    if (!nidana2SubMode) return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        {[{mode:'kamma',label:'Nghiệp thức',desc:'Nghiệp thức quá khứ',color:'bg-blue-100 text-blue-800 border-blue-200'},
          {mode:'sahajata',label:'Câu sinh thức',desc:'Thức sanh cùng',color:'bg-indigo-100 text-indigo-800 border-indigo-200'} 
        ].map(o => (
          <button key={o.mode} onClick={()=>{setNidana2SubMode(o.mode);setNidanaViewMode('cause');setNidanaCycleIndex(0);}}
            className={`px-6 py-4 rounded-xl border-2 w-72 text-left hover:scale-105 transition-all shadow-sm ${o.color}`}>
            <p className="font-black text-base">{o.label}</p>
            <p className="text-xs font-normal mt-1 opacity-80">{o.desc}</p>
          </button>
        ))}
      </div>
    );
if (nidana2SubMode === 'sahajata') {
  const SAH_CYCS = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
  const SAH_PVMAP = {'Nhãn thức':'cakkhu','Nhĩ thức':'sota','Tỷ thức':'ghana','Thiệt thức':'jivha','Thân thức':'kaya','Tiếp thâu':'cakkhu','Quan sát':'cakkhu','Đồng sở duyên':'cakkhu'};
  const curSahType = SAH_CYCS[nidanaCycleIndex % SAH_CYCS.length];
  const matchSah = vithiData.find(n => n.name === curSahType || n.name.includes(curSahType));
  const isPancaVin2 = ['Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức'].some(v => curSahType.includes(v));
  const sahRupa = curSahType === 'Kiết sanh' ? 'Sắc Nghiệp sinh 30' : isPancaVin2 ? '' : 'Sắc Tâm sinh 8';

  const n2SahClick = () => {
    const ni = (nidanaCycleIndex + 1) % SAH_CYCS.length;
    setNidanaCycleIndex(ni);
    const nt = SAH_CYCS[ni];
    const vt = SAH_PVMAP[nt];
    if (vt) { if (activePhase !== 'pavatti') setActivePhase('pavatti'); if (activeVithi !== vt) setActiveVithi(vt); }
    else if (nt === 'Kiết sanh') { if (activePhase !== 'patisandhi') setActivePhase('patisandhi'); }
else if (nt === 'Hữu phần') {
    if (activePhase !== 'patisandhi') setActivePhase('patisandhi');
    setTimeout(() => {
        const patIdx = vithiData.findIndex(n => n.name === 'Kiết sanh');
        const bhvIdx = vithiData.findIndex((n, i) => i > patIdx && n.isBhavangaNode && n.name === 'Hữu phần');
        if (bhvIdx !== -1) setCurrentIndex(bhvIdx);
    }, 50);
}
    else if (nt === 'Tử tâm') { if (activePhase !== 'cuti') setActivePhase('cuti'); }
  };

  const causeNode = activeNode;
const causeCount = causeNode.cetasikaOnlyCount || 0;
const hasCittaja = validRupas?.cittaja;
const effectDesc = `Tâm sở ${toMyanmarNum(causeCount)}${hasCittaja ? ' + Sắc Tâm sinh 8' : ''}`;

return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-2">
      <button onClick={()=>setNidana2SubMode(null)} className="text-[10px] text-cyan-600 font-bold self-start px-2 py-1 bg-cyan-50 rounded">← Câu sinh Thức</button>
      <div className="cursor-pointer px-5 py-2.5 rounded-lg text-center border-2 bg-blue-500 text-white ring-2 ring-blue-300 shadow-md w-56" onClick={n2SahClick}>
        <p className="font-black text-sm">{(() => { const n = activeNode.name.replace(/^[0-9]+\s*-\s*/,''); return n.includes('thức') ? n : n + ' thức'; })()}</p>
        <p className="text-xs mt-0.5 opacity-80">Tâm</p>
      </div>
      <ArrowDown className="text-cyan-500 w-5 h-5 animate-bounce" />
      <div className="px-5 py-2.5 rounded-lg text-center border-2 bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-md w-56">
        <p className="font-black text-sm">Danh Sắc {causeNode.name.replace(/^[0-9]+\s*-\s*/,'')}</p>
        <p className="text-xs mt-0.5 opacity-80">{effectDesc}</p>
      </div>
      </div>
  );
}
    const isKamma = nidana2SubMode === 'kamma';
    const curEffType = N2_CYCLE[nidanaCycleIndex % N2_CYCLE.length];
    const matchEffNode = vithiData.find(n => n.name === curEffType || n.name.includes(curEffType));
    const kammaCount = BASE_K[matchEffNode?.base] ?? 39;
    const n2EffClick = () => {
      const ni = (nidanaCycleIndex + 1) % N2_CYCLE.length;
      setNidanaCycleIndex(ni);
      const nt = N2_CYCLE[ni];
      const vt = PVMAP[nt];
      if (vt) { if (activePhase !== 'pavatti') setActivePhase('pavatti'); if (activeVithi !== vt) setActiveVithi(vt); }
      else if (nt === 'Kiết sanh' || nt === 'Hữu phần') { if (activePhase !== 'patisandhi') setActivePhase('patisandhi'); }
      else if (nt === 'Tử tâm') { if (activePhase !== 'cuti') setActivePhase('cuti'); }
      setNidanaViewMode('effect');
    };
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-4">
        <button onClick={()=>setNidana2SubMode(null)} className="text-[10px] text-cyan-600 font-bold self-start px-2 py-1 bg-cyan-50 rounded">
          ← {isKamma ? 'Nghiệp Thức' : 'Câu sinh Thức'}
        </button>
        <div onClick={()=>{ if(activePhase!=='patisandhi') setActivePhase('patisandhi'); setNidanaViewMode('cause'); }} className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-32 ${nidanaViewMode==='cause'?'bg-rose-500 text-white ring-2 ring-rose-300 scale-105':'bg-rose-50 text-rose-800 border-rose-200 hover:scale-105'}`}>
          <p className="font-black text-sm">{isKamma ? 'Nghiệp Thức' : 'Câu sinh Thức'}</p>
        </div>
        <ArrowDown className="text-cyan-500 w-6 h-6 animate-bounce" />
        <div onClick={n2EffClick} className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-52 ${nidanaViewMode==='effect'?'bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105':'bg-emerald-50 text-emerald-800 border-emerald-200 hover:scale-105'}`}>
          <p className="font-black text-sm">Danh Sắc {curEffType}</p>
{matchEffNode && <p className="text-xs mt-1 opacity-80">Danh pháp {toMyanmarNum(matchEffNode.count)} loại{isKamma ? ` + Sắc Nghiệp sinh ${toMyanmarNum(kammaCount)}` : ''}</p>}
        </div>
      </div>
    );
  }
  if (selectedNidana === 3) {
  const N3_MODES = [
    { id:'nama_mana', label:'Danh → Ý xứ', cause:'Danh', effect:'Ý xứ' },
    { id:'nama_rupa_ay', label:'Danh → Sắc xứ', cause:'Danh', effect:'Sắc xứ (Nhãn xứ v.v.)' },
    { id:'rupa_rupa_ay', label:'Sắc → Sắc xứ', cause:'Sắc Nghiệp sinh', effect:'Sắc xứ' },
    { id:'rupa_mana', label:'Sắc → Ý xứ', cause:'Ý căn', effect:'Ý xứ' },
    { id:'namarupa_mana', label:'Danh Sắc → Ý xứ', cause:'Danh Sắc', effect:'Ý xứ' },
  ];
  const curN3 = N3_MODES.find(m=>m.id===nidana3SubMode);
  const curCitta = activeNode;
  const cetCount = curCitta.cetasikaOnlyCount || 0;
  const SAH_CYCS_N3 = ['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
  const curN3VipType = SAH_CYCS_N3[nidanaCycleIndex % SAH_CYCS_N3.length];
  const matchN3 = vithiData.find(n => n.name === curN3VipType || n.name.includes(curN3VipType));
  const n3NamaManaClick = () => {
    const n3NamaRupaAyClick = () => {
    if (activePhase !== 'patisandhi') { setActivePhase('patisandhi'); setTimeout(() => setCurrentIndex(vithiData.findIndex(n => n.name === 'Kiết sanh') + 1 || 0), 100); return; }
    const patIdx = vithiData.findIndex(n => n.name === 'Kiết sanh');
    if (currentIndex <= patIdx) setCurrentIndex(patIdx + 1);
    else setCurrentIndex(currentIndex + 1 < vithiData.length ? currentIndex + 1 : patIdx + 1);
  };
    const ni = (nidanaCycleIndex + 1) % SAH_CYCS_N3.length;
    setNidanaCycleIndex(ni);
    const nt = SAH_CYCS_N3[ni];
    const PVMAP_N3 = {'Nhãn thức':'cakkhu','Nhĩ thức':'sota','Tỷ thức':'ghana','Thiệt thức':'jivha','Thân thức':'kaya','Tiếp thâu':'cakkhu','Quan sát':'cakkhu','Đồng sở duyên':'cakkhu'};
    const vt = PVMAP_N3[nt];
    if (vt) { if (activePhase !== 'pavatti') setActivePhase('pavatti'); if (activeVithi !== vt) setActiveVithi(vt); }
    else if (nt === 'Kiết sanh' || nt === 'Hữu phần') { if (activePhase !== 'patisandhi') setActivePhase('patisandhi'); }
    else if (nt === 'Tử tâm') { if (activePhase !== 'cuti') setActivePhase('cuti'); }
};

  if (!nidana3SubMode) return (
    <div className="flex flex-col items-center justify-center h-full gap-2 py-2">
      {N3_MODES.map(m=>(
        <button key={m.id} onClick={()=>setNidana3SubMode(m.id)}
          className="px-4 py-2.5 rounded-xl border-2 w-64 text-left hover:scale-105 transition-all shadow-sm bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100">
          <p className="font-black text-xs">{m.label}</p>
        </button>
      ))}
    </div>
  );

  const getCauseContent = () => {
    if (curN3.id === 'nama_mana')
  return `${activeNode.name.replace(/^[0-9]+\s*-\s*/,'')} (Danh) = Tâm sở ${toMyanmarNum(activeNode.cetasikaOnlyCount || 0)}`;
    if (curN3.id === 'nama_rupa_ay') {
      if (curCitta.name === 'Kiết sanh') return '';
  const cleanName = curCitta.name.replace(/^[0-9]+\s*-\s*/,'');
  return `Danh uẩn ${cleanName} (${toMyanmarNum(curCitta.count)} loại)`;
}
    if (curN3.id === 'rupa_rupa_ay') {
      const CAUSES = ['Bốn đại chủng','Mạng căn','Dưỡng tố'];
      const KALAPAS = ['(Bọn 10 Nhãn căn)','(Bọn 10 Nhĩ căn)','(Bọn 10 Tỷ căn)','(Bọn 10 Thiệt căn)','(Bọn 10 Thân căn)'];
      return `${CAUSES[rupaRupaAyState.causeIdx]} ${KALAPAS[rupaRupaAyState.effectIdx]}`;
    }
    if (curN3.id === 'rupa_mana') {
      const curName = vithiData[currentIndex]?.name || '';
      if (curName === 'Kiết sanh') return 'Sắc Nghiệp sinh (Kiết sanh) (30)';
      const pancaPassada = {'Nhãn thức':'Nhãn căn','Nhĩ thức':'Nhĩ căn','Tỷ thức':'Tỷ căn','Thiệt thức':'Thiệt căn','Thân thức':'Thân căn'};
      for (const [key, val] of Object.entries(pancaPassada)) {
        if (curName.includes(key)) return `${val} (63)`;
      }
      const _cutiIdx = vithiData.findIndex(n => n.name === 'Tử tâm');
    let refIdx;
    if (_cutiIdx !== -1 && currentIndex >= _cutiIdx - 16 && currentIndex <= _cutiIdx) {
        refIdx = _cutiIdx - 17;
    } else {
        refIdx = currentIndex - 1;
    }
    const causeCitta = vithiData[refIdx];
    const causeName = causeCitta ? causeCitta.name : '';
    const curBase = vithiData[currentIndex]?.base || '';
    let rupaCount = '63';
    if (curBase.includes('30')) rupaCount = '30';
    else if (curBase.includes('46')) {
        rupaCount = vithiData[currentIndex - 1]?.name === 'Kiết sanh' ? '38' : '46';
    } else if (curBase.includes('53')) rupaCount = '53';
    return `Ý căn nương của ${causeName} (${rupaCount})`;
    }
    const _nm = vithiData[currentIndex]?.name || '';
    let _rupaDesc = '';
    if (_nm === 'Kiết sanh') _rupaDesc = 'Sắc Nghiệp sinh (30)';
    else {
        const _pp = {'Nhãn thức':'Nhãn căn','Nhĩ thức':'Nhĩ căn','Tỷ thức':'Tỷ căn','Thiệt thức':'Thiệt căn','Thân thức':'Thân căn'};
        let _found = false;
        for (const [k, v] of Object.entries(_pp)) {
            if (_nm.includes(k)) { _rupaDesc = `${v} (${k === 'Thân thức' ? '53' : '63'})`; _found = true; break; }
        }
        if (!_found) {
            const _ci = vithiData.findIndex(n => n.name === 'Tử tâm');
            const _ref = (_ci !== -1 && currentIndex >= _ci - 16 && currentIndex <= _ci)
                ? vithiData[_ci - 17] : vithiData[currentIndex - 1];
            const _rn = _ref ? _ref.name : '';
            const _baseNum = vithiData[currentIndex]?.base?.includes('46') ? '46' : '63';
            _rupaDesc = `Ý căn nương của ${_rn} (${_baseNum})`;
        }
    }
    return `Danh (Tâm sở ${toMyanmarNum(curCitta.cetasikaOnlyCount || 0)}) + Sắc ${_rupaDesc}`;
  };
  const getEffectContent = () => {
    if (curN3.id === 'rupa_rupa_ay') {
      const EFFECTS = ['Nhãn xứ','Nhĩ xứ','Tỷ xứ','hiệt xứ','Thân xứ'];
      return EFFECTS[rupaRupaAyState.effectIdx];
    }
    if (curN3.id === 'nama_rupa_ay') {
      if (curCitta.name === 'Kiết sanh') return '—';
      const allPatIndices = vithiData.reduce((acc, n, i) =>
        n.name === 'Kiết sanh' ? [...acc, i] : acc, []);
      for (const patIdx of allPatIndices) {
        if (currentIndex === patIdx + 1) return 'Sắc Tứ sinh lúc Kiết sanh (Nghiệp + Quý)';
        if (currentIndex === patIdx + 2) return 'Sắc Tứ sinh lúc Hữu phần thứ nhất (Nghiệp + Tâm + Quý)';
      }
      const rupaTypes = [];
  if (validRupas.kammaja) rupaTypes.push('Nghiệp');
  if (validRupas.cittaja) rupaTypes.push('Tâm');
  if (validRupas.utuja) rupaTypes.push('Quý');
  if (validRupas.aharaja) rupaTypes.push('Vật thực');
  const prefixMap = {4:'Tứ sinh sắc',3:'Tam sinh sắc',2:'Nhị sinh sắc',1:'Nhất sinh sắc'};
  return `${prefixMap[rupaTypes.length]||'Sắc do duyên'} (${rupaTypes.join(' + ')})`;
    }
    if (curN3.id === 'nama_mana') return `Ý xứ ${activeNode.name.replace(/^[0-9]+\s*-\s*/,'')}`;
    return `Ý xứ ${curCitta.name}`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-2">
      <button onClick={()=>setNidana3SubMode(null)} className="text-[10px] text-teal-600 font-bold self-start px-2 py-1 bg-teal-50 rounded">← {curN3.label}</button>
      <div onClick={curN3.id === 'nama_mana' ? n3NamaManaClick : curN3.id === 'rupa_rupa_ay' ? () => setRupaRupaAyState(prev => ({...prev, causeIdx: (prev.causeIdx+1)%3})) : undefined} className={`px-5 py-2.5 rounded-lg text-center border-2 bg-rose-500 text-white ring-2 ring-rose-300 shadow-md w-60 ${(curN3.id === 'nama_mana' || curN3.id === 'rupa_rupa_ay') ? 'cursor-pointer hover:scale-105 transition-all' : ''}`}>
        <p className="font-black text-xs leading-snug">{getCauseContent()}</p>
      </div>
      <ArrowDown className="text-teal-500 w-5 h-5 animate-bounce" />
      <div onClick={curN3.id === 'nama_mana' ? n3NamaManaClick : curN3.id === 'rupa_rupa_ay' ? () => setRupaRupaAyState(prev => ({...prev, effectIdx: (prev.effectIdx+1)%5})) : undefined} className={`px-5 py-2.5 rounded-lg text-center border-2 bg-teal-500 text-white ring-2 ring-teal-300 shadow-md w-60 ${(curN3.id === 'nama_mana' || curN3.id === 'rupa_rupa_ay') ? 'cursor-pointer hover:scale-105 transition-all' : ''}`}>
        {curN3.id === 'nama_rupa_ay' && activePhase === 'pavatti' && showAyatanaDetail ? (
          <div className="flex flex-col gap-1 items-center">
            {['Nhãn xứ','Nhĩ xứ','Tỷ xứ','hiệt xứ','Thân xứ'].map((a,i)=>(
              <span key={i} className="text-[10px] font-bold bg-white/20 rounded px-2 py-0.5">{a}</span>
            ))}
          </div>
        ) : (
          <p className="font-black text-xs leading-snug">{getEffectContent()}</p>
        )}
      </div>
      {curN3.id === 'nama_rupa_ay' && activePhase === 'pavatti' && (
        <button onClick={()=>setShowAyatanaDetail(v=>!v)} className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-teal-700 text-white hover:bg-teal-800 shadow border border-teal-500 transition-all">
          {showAyatanaDetail ? '← Quay lại Sắc pháp' : '5 Sắc Xứ ▶'}
        </button>
      )}
    </div>
  );
}
if (selectedNidana === 4) {
    const _n4name = activeNode.name.replace(/^[0-9]+\s*-\s*/,'');
    const _n4phassa = (n => {
      if (n.includes("Nhãn thức")) return "Nhãn xúc";
      if (n.includes("Nhĩ thức")) return "Nhĩ xúc";
      if (n.includes("Tỷ thức")) return "Tỷ xúc";
      if (n.includes("Thiệt thức")) return "Thiệt xúc";
      if (n.includes("Thân thức")) return "Thân xúc";
      return "Hữu phần dứt dòng";
    })(activeNode.name);
    const _n4vatthu = (n => {
      if (n.includes("Nhãn thức")) return "Nhãn xứ (= Nhãn căn)";
      if (n.includes("Nhĩ thức")) return "Nhĩ xứ (= Nhĩ căn)";
      if (n.includes("Tỷ thức")) return "Tỷ xứ (= Tỷ căn)";
      if (n.includes("Thiệt thức")) return "hiệt xứ (= Thiệt căn)";
      if (n.includes("Thân thức")) return "Thân xứ (= Thân căn)";
      return "ဟဒယဝတ္ထု (ဓမ္မာယတန)";
    })(activeNode.name);
    const _n4aram = ["Kiết sanh","Hữu phần","Tử tâm"].some(k=>activeNode.name.includes(k))
      ? "Nghiệp/Tướng nghiệp/Tướng thú (Ngoại pháp xứ)"
      : ["cakkhu","sota","ghana","jivha","kaya"].includes(activeVithi)
        ? {"cakkhu":"Sắc xứ","sota":"Thinh xứ","ghana":"Khí xứ","jivha":"Vị xứ","kaya":"Xúc xứ"}[activeVithi]
        : `${activeNode.aramana || "Pháp"} (Pháp xứ)`;
    const _n4list = [
      _n4vatthu,
      _n4aram,
      `${_n4name} မနာယတန`,
      `သမ္ပယုတ်ဓမ္မာယတန (= ${toMyanmarNum(activeNode.cetasikaOnlyCount - 1)} loại)`
    ];
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-[9px] font-bold opacity-70 mb-1">({toMyanmarNum(nidana4CycleIdx+1)}/4)</p>
          <div onClick={()=>setNidana4CycleIdx(p=>(p+1)%4)}
          className="cursor-pointer px-5 py-3 rounded-xl text-center border-2 bg-rose-500 text-white ring-2 ring-rose-300 shadow-md w-64 hover:scale-105 transition-all">
          <p className="font-black text-sm leading-snug">{_n4list[nidana4CycleIdx]}</p>
        </div>
        <ArrowDown className="text-teal-500 w-6 h-6 animate-bounce" />
          <div className="px-5 py-3 rounded-xl text-center border-2 bg-teal-500 text-white ring-2 ring-teal-300 shadow-md w-64">
          <p className="font-black text-sm">{_n4name} {_n4phassa}</p>
        </div>
      </div>
    );
  }
  if (selectedNidana === 5) {
    const N5_S = ['Nhãn xúc','Nhĩ xúc','Tỷ xúc','Thiệt xúc','Thân xúc','Hữu phần dứt dòng'];
    const N5_V = ['Nhãn môn lộ tâm','Nhĩ môn lộ tâm','Tỷ môn lộ tâm','Thiệt môn lộ tâm','Thân môn lộ tâm','Hữu phần dứt dòngဇာဝေဒနာ'];
    const _ci5 = nidanaCycleIndex % 6;
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 py-4">
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên Nhân</p>
        <div onClick={() => {
          setNidana5SubMode('cause');
          const N5_VITHI = ['cakkhu','sota','ghana','jivha','kaya','mano_kama'];
          const N5_SRC2 = ['Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Hữu phần dứt dòng'];
          const _ci = nidanaCycleIndex % 6;
          if (_ci < 5) { if (activePhase !== 'pavatti') setActivePhase('pavatti'); setActiveVithi(N5_VITHI[_ci]); }
          const tIdx = vithiData.findIndex(n => n.name.includes(N5_SRC2[_ci]) || n.name === N5_SRC2[_ci]);
          if (tIdx !== -1) setCurrentIndex(tIdx);
        }} onDoubleClick={() => {
          const next = (nidanaCycleIndex + 1) % 6;
          setNidana5SubMode('cause');
          setNidanaCycleIndex(next);
          const N5_VITHI = ['cakkhu','sota','ghana','jivha','kaya','mano_kama'];
          const N5_SRC2 = ['Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Hữu phần dứt dòng'];
          if (activePhase !== 'pavatti') setActivePhase('pavatti');
          setActiveVithi(N5_VITHI[next]);
          const tIdx = vithiData.findIndex(n => n.name.includes(N5_SRC2[next]) || n.name === N5_SRC2[next]);
          if (tIdx !== -1) setCurrentIndex(tIdx);
        }}
          className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-72 shadow-sm
            ${nidana5SubMode==='cause' ? 'bg-rose-500 text-white ring-2 ring-rose-300 scale-105' : 'bg-rose-50 text-rose-800 border-rose-200 hover:scale-105'}`}>
          <p className="font-black text-sm">{N5_S[_ci5]}</p>
        </div>
        <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
        <div onClick={() => {
          setNidana5SubMode('effect');
          const N5_SRC2 = ['Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Hữu phần dứt dòng'];
          const N5_PV2 = ['Nhãn môn lộ tâm','Nhĩ môn lộ tâm','Tỷ môn lộ tâm','Thiệt môn lộ tâm','Thân môn lộ tâm'];
          const _ci = nidanaCycleIndex % 6;
          let tIdx = -1;
          if (_ci < 5) {
            tIdx = vithiData.findIndex(n => n.vithi?.includes(N5_PV2[_ci]) && !n.name.includes(N5_SRC2[_ci]));
          } else {
            const upIdx = vithiData.findIndex(n => n.name === 'Hữu phần dứt dòng');
            if (upIdx !== -1) tIdx = vithiData.findIndex((n, i) => i > upIdx && (n.vithi?.includes('Ý môn') || n.vithi?.includes('Bắt cảnh')));
          }
          if (tIdx !== -1) setCurrentIndex(tIdx);
        }} onDoubleClick={() => {
          const next = (nidanaCycleIndex + 1) % 6;
          setNidana5SubMode('cause');
          setNidanaCycleIndex(next);
          const N5_VITHI = ['cakkhu','sota','ghana','jivha','kaya','mano_kama'];
          const N5_SRC2 = ['Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Hữu phần dứt dòng'];
          if (activePhase !== 'pavatti') setActivePhase('pavatti');
          setActiveVithi(N5_VITHI[next]);
          const tIdx2 = vithiData.findIndex(n => n.name.includes(N5_SRC2[next]) || n.name === N5_SRC2[next]);
          if (tIdx2 !== -1) setCurrentIndex(tIdx2);
        }}
          className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-72 shadow-sm
            ${nidana5SubMode==='effect' ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:scale-105'}`}>
          <p className="font-black text-sm">{N5_V[_ci5]}</p>
        </div>
      </div>
    );
  }
  if (selectedNidana === 6) {
    const N6_VEDANA = ['Nhãn xúc sinh Thọ','Nhĩ xúc sinh Thọ','Tỷ xúc sinh Thọ','Thiệt xúc sinh Thọ','Thân xúc sinh Thọ','Ý xúc sinh Thọ'];
    const N6_TANHA = ['Sắc Ái','Thinh Ái','Hương Ái','Vị Ái','Xúc Ái','Pháp Ái'];
    const N6_ARAM = ['Cảnh sắc','Cảnh thinh','Cảnh hương','Cảnh vị','Cảnh xúc','Cảnh pháp'];
    const N6_VITHI = ['cakkhu','sota','ghana','jivha','kaya','mano_kama'];
    const N6_SRC = ['Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Hữu phần dứt dòng'];
    const N6_PV = ['Nhãn môn lộ tâm','Nhĩ môn lộ tâm','Tỷ môn lộ tâm','Thiệt môn lộ tâm','Thân môn lộ tâm'];
    const _ci6 = nidanaCycleIndex % 6;
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 py-4">
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên Nhân</p>
        <div onClick={() => {
          setNidana5SubMode('cause');
          const _ci = nidanaCycleIndex % 6;
          if (activePhase !== 'pavatti') setActivePhase('pavatti');
          setActiveVithi(N6_VITHI[_ci] || 'mano_kama');
          
        }} onDoubleClick={() => {
          const next = (nidanaCycleIndex + 1) % 6;
          setNidana5SubMode('cause');
          setNidanaCycleIndex(next);
          if (activePhase !== 'pavatti') setActivePhase('pavatti');
          setActiveVithi(N6_VITHI[next] || 'mano_kama');
        }}
          className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-72 shadow-sm
            ${nidana5SubMode==='cause' ? 'bg-rose-500 text-white ring-2 ring-rose-300 scale-105' : 'bg-rose-50 text-rose-800 border-rose-200 hover:scale-105'}`}>
          <p className="font-black text-sm">{N6_VEDANA[_ci6]}</p>
        </div>
        <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
        <div onClick={() => { setNidana5SubMode('effect'); }}
         onDoubleClick={() => {
          const next = (nidanaCycleIndex + 1) % 6;
          setNidana5SubMode('effect');
          setNidanaCycleIndex(next);
        }}
          className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-72 shadow-sm
            ${nidana5SubMode==='effect' ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:scale-105'}`}>
          <p className="font-black text-sm">{N6_TANHA[_ci6]}</p>
          <p className="text-xs mt-1 opacity-80">{N6_ARAM[_ci6]}</p>
        </div>
      </div>
    );
  }
  if (selectedNidana === 7) {
  const N7_PAIRS = [
    { tanha: 'Dục ái', upadana: 'Dục thủ' },
    { tanha: 'Hữu ái', upadana: 'Kiến thủ / Ngã ngữ thủ' },
    { tanha: 'Phi hữu ái', upadana: 'Kiến thủ / Ngã ngữ thủ' },
  ];
  const N7_TANHA6 = ['Cảnh sắc','Cảnh thinh','Cảnh hương','Cảnh vị','Cảnh xúc','Cảnh pháp'];
  const N7_ARAM6 = ['Sắc Ái','Thinh Ái','Hương Ái','Vị Ái','Xúc Ái','Pháp Ái'];
  const curPair = N7_PAIRS[nidana4CycleIdx % 3];
  const curTanha6 = N7_TANHA6[nidanaCycleIndex % 6];
  const curAram6 = N7_ARAM6[nidanaCycleIndex % 6];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-2">
      <div
        onClick={() => setNidanaViewMode('cause')}
        onDoubleClick={() => setNidana4CycleIdx(p => (p + 1) % 3)}
        className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-72 shadow-sm
          ${nidanaViewMode === 'cause' ? 'bg-rose-500 text-white ring-2 ring-rose-300 scale-105' : 'bg-rose-50 text-rose-800 border-rose-200 hover:scale-105'}`}>
        <p className="font-black text-sm">{curPair.tanha}</p>
        <p className="text-xs mt-0.5 opacity-75">{curAram6}</p>
      </div>
      <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
      <div
        onClick={() => setNidanaViewMode('effect')}
        onDoubleClick={() => setNidana4CycleIdx(p => (p + 1) % 3)}
        className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-72 shadow-sm
          ${nidanaViewMode === 'effect' ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:scale-105'}`}>
        <p className="font-black text-sm">{curPair.upadana}</p>
      </div>
    </div>
  );
}
if (selectedNidana === 8) {
  const goToCutiAvijja = () => {
    if (activePhase !== 'cuti') { setActivePhase('cuti'); return; }
    const idx = vithiData.findIndex(n => n.isAvijjaNode && n.avijjaIdx === 1);
    if (idx !== -1) setCurrentIndex(idx);
  };
  const goToCutiSankhara = () => {
    if (activePhase !== 'cuti') { setActivePhase('cuti'); return; }
    const idx = vithiData.findIndex(n => n.isSankharaNode);
    if (idx !== -1) setCurrentIndex(idx);
  };
  const goToCutiPatisandhi = () => {
    if (activePhase !== 'cuti') { setActivePhase('cuti'); return; }
    const allPat = vithiData.reduce((acc, n, i) => n.name === 'Kiết sanh' ? [...acc, i] : acc, []);
    const lastPat = allPat[allPat.length - 1];
    if (lastPat !== undefined) setCurrentIndex(lastPat);
  };
  const n8Btn = (row, mode, label, sub) => {
    const active = nidana4CycleIdx === row && nidanaViewMode === mode;
    const isRose = mode === 'cause';
    return (
      <div className={`cursor-pointer px-4 py-3 rounded-lg text-center border-2 shadow-md w-36 hover:scale-105 transition-all ${
        active ? (isRose ? 'bg-rose-600 text-white ring-4 ring-rose-300 scale-105' : 'bg-emerald-600 text-white ring-4 ring-emerald-300 scale-105')
               : (isRose ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
      }`}
        onClick={() => {
          setNidana4CycleIdx(row); setNidanaViewMode(mode);
          if (row === 0 && mode === 'cause') goToCutiAvijja();
          else if (mode === 'cause') goToCutiSankhara();
          else if (row === 0) goToCutiSankhara();
          else goToCutiPatisandhi();
        }}>
        <p className="font-black text-xs">{label}</p>
        {sub && <p className="text-[10px] mt-0.5 opacity-80">{sub}</p>}
      </div>
    );
  };
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-2">
      <div className="flex items-center gap-3 w-full justify-center">
        {n8Btn(0, 'cause', 'Dục thủ')}
        <ChevronRight className="text-pink-500 w-6 h-6 shrink-0" />
        {n8Btn(0, 'effect', 'Nghiệp hữu', 'Nghiệp thiện/bất thiện')}
      </div>
      <div className="flex items-center gap-3 w-full justify-center">
        {n8Btn(1, 'cause', 'Nghiệp hữu', 'Nghiệp thiện/bất thiện')}
        <ChevronRight className="text-pink-500 w-6 h-6 shrink-0" />
        {n8Btn(1, 'effect', 'Sanh hữu', 'Kiết sanh tương lai')}
      </div>
    </div>
  );
}
if (selectedNidana === 9) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-2">
      <div onClick={() => {
        setNidanaViewMode('cause');
        if (activePhase !== 'cuti') { setActivePhase('cuti'); return; }
        const idx = vithiData.findIndex(n => n.isSankharaNode);
        if (idx !== -1) setCurrentIndex(idx);
      }} className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-60 shadow-sm
        ${nidanaViewMode === 'cause' ? 'bg-rose-500 text-white ring-2 ring-rose-300 scale-105' : 'bg-rose-50 text-rose-800 border-rose-200 hover:scale-105'}`}>
        <p className="font-black text-sm">Nghiệp hữu</p>
        <p className="text-xs mt-0.5 opacity-80">Nghiệp thiện/bất thiện</p>
      </div>
      <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
      <div onClick={() => {
        setNidanaViewMode('effect');
        if (activePhase !== 'cuti') { setActivePhase('cuti'); return; }
        const allPat = vithiData.reduce((acc, n, i) => n.name === 'Kiết sanh' ? [...acc, i] : acc, []);
        const lastPat = allPat[allPat.length - 1];
        if (lastPat !== undefined) setCurrentIndex(lastPat);
      }} className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-60 shadow-sm
        ${nidanaViewMode === 'effect' ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:scale-105'}`}>
        <p className="font-black text-sm">Sanh</p>
        <p className="text-xs mt-0.5 opacity-80">Kiết sanh tương lai</p>
      </div>
    </div>
  );
}
if (selectedNidana === 10) {
  const N10_EFFECTS = ["Lão tử","Sầu","Bi","Khổ","Ưu","Não"];
  const curEff = N10_EFFECTS[nidana10EffectIdx % 6];

  const goToCause = () => {
    setNidanaViewMode('cause');
    setCurrentLifeOffset(nidana10BaseOffset);
    setActivePhase('cuti');
  };

  const goToEffect = () => {
    setNidanaViewMode('effect');
    setCurrentLifeOffset(nidana10BaseOffset + 1);
    if (curEff === 'Lão tử') {
      setCurrentLifeOffset(nidana10BaseOffset + 1);
      setActivePhase('cuti');
    } else if (['Sầu','Bi','Ưu','Não'].includes(curEff)) {
      setCurrentLifeOffset(nidana10BaseOffset + 1);
      setActivePhase('pavatti');
      setActiveVithi('mano_kama');
      setJavanaGroupId('akusala_dosa');
      setJavanaSubIndex(0);
    } else if (curEff === 'Khổ') {
      setCurrentLifeOffset(nidana10BaseOffset + 1);
      setActivePhase('pavatti');
      setActiveVithi('kaya');
      setAramQIndex(3);
    
      setJavanaGroupId('kama_kusala');
  setJavanaSubIndex(0);
      setTimeout(() => {
        const idx = vithiData.findIndex(n => n.name.includes('Thân thức'));
        if (idx !== -1) setCurrentIndex(idx);
      }, 100);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-2">
      <div onClick={goToCause}
        className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-60 shadow-sm
          ${nidanaViewMode==='cause'?'bg-rose-500 text-white ring-2 ring-rose-300 scale-105':'bg-rose-50 text-rose-800 border-rose-200 hover:scale-105'}`}>
        <p className="font-black text-sm">Sanh</p>
        <p className="text-xs mt-0.5 opacity-80">Sự phát sinh tâm Kiết sanh</p>
      </div>
      <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
      <div
        onClick={goToEffect}
        onDoubleClick={() => setNidana10EffectIdx(p => (p+1) % 6)}
        className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-60 shadow-sm
          ${nidanaViewMode==='effect'?'bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105':'bg-emerald-50 text-emerald-800 border-emerald-200 hover:scale-105'}`}>
        <p className="font-black text-sm">{curEff}</p>
        <p className="text-xs mt-0.5 opacity-60">({toMyanmarNum(nidana10EffectIdx % 6 + 1)}/6)</p>
      </div>
    </div>
  );
}
  const isN0 = selectedNidana === 0;
  const isN1 = selectedNidana === 1;
  const _VT2=['Kiết sanh','Hữu phần','Tử tâm','Nhãn thức','Nhĩ thức','Tỷ thức','Thiệt thức','Thân thức','Tiếp thâu','Quan sát','Đồng sở duyên'];
const curType = _VT2[nidanaCycleIndex % _VT2.length];
  const matchNode = vithiData.find(n => n.name === curType || n.name.includes(curType));

  const causeClick = () => {
    setNidanaViewMode('cause');
    if (isN0) {
        if (activePhase !== 'patisandhi') { setActivePhase('patisandhi'); return; }
        const idx = vithiData.findIndex(n => n.isAvijjaNode);
        if (idx !== -1) { setCurrentIndex(idx); setNidanaViewMode('cause'); }
    } 
};
  const PANCAVITHI_MAP = {'Nhãn thức':'cakkhu','Nhĩ thức':'sota','Tỷ thức':'ghana','Thiệt thức':'jivha','Thân thức':'kaya','Tiếp thâu':'cakkhu','Quan sát':'cakkhu','Đồng sở duyên':'cakkhu'};
  const effectClick = () => {
    if (isN0) {
      if (activePhase !== 'patisandhi') { setActivePhase('patisandhi'); return; }
      const idx = vithiData.findIndex(n => n.isSankharaNode);
      if (idx !== -1) { setCurrentIndex(idx); setNidanaViewMode('effect'); }
    } else if (isN1) {
      const nextIdx = (nidanaCycleIndex + 1) % VIPAKA_TYPES.length;
      setNidanaCycleIndex(nextIdx);
      const nextType = VIPAKA_TYPES[nextIdx];
      const vithiTarget = PANCAVITHI_MAP[nextType];
      if (vithiTarget) {
        if (activePhase !== 'pavatti') setActivePhase('pavatti');
        if (activeVithi !== vithiTarget) setActiveVithi(vithiTarget);
      } else if (nextType === 'Kiết sanh' || nextType === 'Hữu phần') {
        if (activePhase !== 'patisandhi') setActivePhase('patisandhi');
      } else if (nextType === 'Tử tâm') {
        if (activePhase !== 'cuti') setActivePhase('cuti');
      }
      setNidanaViewMode('effect');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-4">
      {/* Cause */}
      <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên Nhân</p>
      <div onClick={causeClick}
        className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-72 shadow-sm
          ${nidanaViewMode==='cause' ? 'bg-rose-500 text-white ring-2 ring-rose-300 scale-105 shadow-lg' : 'bg-rose-50 text-rose-800 border-rose-200 hover:scale-105'}`}>
        
        <p className="font-black text-sm">{isN0 ? 'Vô minh' : 'Hành'}</p>
        </div>
        <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
        {/* Effect */}
      <div onClick={effectClick}
        className={`cursor-pointer px-6 py-3 rounded-lg text-center border-2 transition-all w-72 shadow-sm
          ${nidanaViewMode==='effect' ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105 shadow-lg' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:scale-105'}`}>
        
        <p className="font-black text-sm">{isN0 ? 'Hành' : (VIPAKA_LABEL_MAP[curType] || curType)}</p>
        {isN1 && matchNode && (
          <>
            <p className="text-xs mt-1 opacity-80">
              ({toMyanmarNum(matchNode.count)} loại)
            </p>
            
          </>
        )}
        {isN0 && <p className="text-xs mt-1 opacity-80"></p>}
      </div>
    </div>
  );
  
})() : khandhaViewIndex === 0 ? (
        displayMode === 'rupa-nama' ? (
                          <div className="flex flex-wrap gap-1 md:gap-1.5 content-start">
                            {activeNode.cetasikas && activeNode.cetasikas.map((cName, i) => (
                              <CetasikaBtn key={i} cName={cName} />
                            ))}
                          </div>
                        ) : displayMode === 'ayatana' ? (
                          <div className="flex flex-wrap gap-1 md:gap-1.5 content-start">
                            {cittaGroup.length > 0 && (
                                <div className="flex flex-wrap gap-1 p-0.5 rounded-lg border-2 border-indigo-200 bg-indigo-50/50" title="Ý xứ (Manāyatana)">
                                    {cittaGroup.map((c, i) => <CetasikaBtn key={`ay-c-${i}`} cName={c} label="Ý xứ" />)}
                                </div>
                            )}
                            {(activeNode.cetasikas || []).filter(c => c !== "Tâm").length > 0 && (
                                <div className="flex flex-col gap-1 p-1 rounded-lg border-2 border-teal-200 bg-teal-50/50">
                                    <span className="text-[9px] font-bold text-teal-700 px-1">Pháp xứ</span>
                                    <div className="flex flex-wrap gap-1">
                                        {(activeNode.cetasikas || []).filter(c => c !== "Tâm").map((c, i) => <CetasikaBtn key={`ay-d-${i}`} cName={c} />)}
                                    </div>
                                </div>
                            )}
                          </div>
                        ) : displayMode === 'dhatu' ? (
                          <div className="flex flex-wrap gap-1 md:gap-1.5 content-start">
                            {cittaGroup.length > 0 && (
                                <div className="flex flex-wrap gap-1 p-0.5 rounded-lg border-2 border-fuchsia-200 bg-fuchsia-50/50">
                                    {cittaGroup.map((c, i) => <CetasikaBtn key={`dh-c-${i}`} cName={c} label={getDhatuVinnanaLabel(activeNode.name)} />)}
                                </div>
                            )}
                            {(activeNode.cetasikas || []).filter(c => c !== "Tâm").length > 0 && (
                                <div className="flex flex-col gap-1 p-1 rounded-lg border-2 border-orange-200 bg-orange-50/50">
                                    <span className="text-[9px] font-bold text-orange-700 px-1">Pháp giới</span>
                                    <div className="flex flex-wrap gap-1">
                                        {(activeNode.cetasikas || []).filter(c => c !== "Tâm").map((c, i) => <CetasikaBtn key={`dh-d-${i}`} cName={c} />)}
                                    </div>
                                </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 md:gap-1.5 content-start">
                            {cittaGroup.length > 0 && (
                                <div className="flex flex-wrap gap-1 p-0.5 rounded-lg border-2 border-indigo-200 bg-indigo-50/50" title="Thức uẩn">
                                    {cittaGroup.map((c, i) => <CetasikaBtn key={`c-${i}`} cName={c} label="Thức uẩn" />)}
                                </div>
                            )}
                            {vedanaGroup.length > 0 && (
                                <div className="flex flex-wrap gap-1 p-0.5 rounded-lg border-2 border-pink-200 bg-pink-50/50" title="Thọ uẩn">
                                    {vedanaGroup.map((c, i) => <CetasikaBtn key={`v-${i}`} cName={c} label={c.replace('Thọ', 'Thọ uẩn')} />)}
                                </div>
                            )}
                            {sannaGroup.length > 0 && (
                                <div className="flex flex-wrap gap-1 p-0.5 rounded-lg border-2 border-amber-200 bg-amber-50/50" title="Tưởng uẩn">
                                    {sannaGroup.map((c, i) => <CetasikaBtn key={`s-${i}`} cName={c} label="Tưởng uẩn" />)}
                                </div>
                            )}
                            {sankharaPrimary.length > 0 && (
                                <div className="flex flex-wrap gap-1 p-0.5 rounded-lg border-2 border-emerald-200 bg-emerald-50/50" title="Hành uẩn">
                                    {sankharaPrimary.map((c, i) => <CetasikaBtn key={`sp-${i}`} cName={c} label="Hành uẩn (Tư)" />)}
                                </div>
                            )}
                            {sankharaSecondary.length > 0 && (
                                <div className="flex flex-wrap gap-1 p-0.5 rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/20" title="Hành uẩn (Các tâm sở còn lại)">
                                    {sankharaSecondary.map((c, i) => <CetasikaBtn key={`ss-${i}`} cName={c} label={c} />)}
                                </div>
                            )}
                          </div>
                        )
                    ) : khandhaViewIndex === 1 ? (
                        <div className="flex flex-col gap-4 p-2 h-full">
                            {paticcaStep > 0 ? (
                                <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200 flex flex-col items-center justify-center text-center h-full">
                                    {(paticcaStep === 1 || paticcaStep === 2) && (
                                        <div className="flex flex-col items-center gap-3">
                                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nhân nhân quá khứ</p>
                                            <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">
                                                {paticcaStep === 1 ? "Vô minh, Ái, Thủ" : "Hành, Nghiệp"}
                                            </div>
                                            <ArrowDown className="text-amber-500 w-8 h-8 animate-bounce" />
<p className="text-indigo-700 font-bold text-sm mt-1">Tâm {paticcaCittaName || activeNode.name} (Sắc uẩn)</p>
                                            {validRupas.kammaja ? (
                                                <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-emerald-300 animate-pulse font-bold text-sm">
                                                    Sắc do nghiệp
                                                </div>
                                            ) : (
                                                <div className="bg-slate-200 text-slate-500 px-6 py-3 rounded-lg border-2 border-dashed border-slate-300 font-bold text-sm flex flex-col items-center gap-1">
                                                    <span>Không phát sinh sắc do nghiệp</span>
                                                    <span className="text-[10px] font-normal">(Không có sắc pháp trong cõi vô sắc)</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {paticcaStep === 3 && (
                                        <div className="flex flex-col items-center gap-3">
                                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nhân nhân hiện tại</p>
                                            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center">
                                                <span className="text-base">{activeNode.name}</span>
                                            </div>
                                            <ArrowDown className="text-amber-500 w-8 h-8 animate-bounce" />
<p className="text-indigo-700 font-bold text-sm mt-1">Tâm {paticcaCittaName || activeNode.name} (Sắc uẩn)</p>
                                            {validRupas.cittaja ? (
                                                <div className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-blue-300 animate-pulse font-bold text-sm">
                                                    Sắc do tâm
                                                </div>
                                            ) : (
                                                <div className="bg-slate-200 text-slate-500 px-6 py-3 rounded-lg border-2 border-dashed border-slate-300 font-bold text-sm flex flex-col items-center gap-1">
                                                    <span>Không phát sinh sắc do tâm</span>
                                                    
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {paticcaStep === 4 && (
                                        <div className="flex flex-col items-center gap-3">
                                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nhân nhân hiện tại</p>
                                            <div className="bg-orange-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">
                                                {utujaCauseText}
                                            </div>
                                            <ArrowDown className="text-amber-500 w-8 h-8 animate-bounce" />
<p className="text-indigo-700 font-bold text-sm mt-1">Tâm {paticcaCittaName || activeNode.name} (Sắc uẩn)</p>
                                            {validRupas.utuja ? (
                                                <div className="bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-orange-300 animate-pulse font-bold text-sm">
                                                    Sắc do thời tiết
                                                </div>
                                            ) : (
                                                <div className="bg-slate-200 text-slate-500 px-6 py-3 rounded-lg border-2 border-dashed border-slate-300 font-bold text-sm">
                                                    Không phát sinh sắc do thời tiết (Cõi vô sắc)
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {paticcaStep === 5 && (
                                        <div className="flex flex-col items-center gap-3">
                                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nhân nhân hiện tại</p>
                                            <div className="bg-rose-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">
                                                Dinh dưỡng trong các vật chất
                                            </div>
                                            <ArrowDown className="text-amber-500 w-8 h-8 animate-bounce" />
<p className="text-indigo-700 font-bold text-sm mt-1">Tâm {paticcaCittaName || activeNode.name} (Sắc uẩn)</p>
                                            {validRupas.aharaja ? (
                                                <div className="bg-rose-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-rose-300 animate-pulse font-bold text-sm">
                                                    Sắc do vật thực
                                                </div>
                                            ) : (
                                                <div className="bg-slate-200 text-slate-500 px-6 py-3 rounded-lg border-2 border-dashed border-slate-300 font-bold text-sm flex flex-col items-center gap-1">
                                                    <span>Chưa phát sinh / Không có sắc do vật thực</span>
                                                    
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
                                    <div className={`p-4 rounded-xl border-2 flex flex-col items-center text-center justify-center transition-all ${validRupas.kammaja ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm hover:scale-[1.02]' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${validRupas.kammaja ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}><User className="w-4 h-4"/></div>
                                        <span className="font-bold text-xs">Sắc do nghiệp</span>
                                        <span className="text-[10px] mt-1 opacity-80">{validRupas.kammaja ? 'Do nghiệp tạo ra' : 'Không có'}</span>
                                    </div>
                                    <div className={`p-4 rounded-xl border-2 flex flex-col items-center text-center justify-center transition-all ${validRupas.cittaja ? 'bg-blue-50 border-blue-200 text-blue-800 shadow-sm hover:scale-[1.02]' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${validRupas.cittaja ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-500'}`}><Cloud className="w-4 h-4"/></div>
                                        <span className="font-bold text-xs">Sắc do tâm</span>
                                        <span className="text-[10px] mt-1 opacity-80">{validRupas.cittaja ? 'Do tâm tạo ra' : 'Không do tâm này'}</span>
                                    </div>
                                    <div className={`p-4 rounded-xl border-2 flex flex-col items-center text-center justify-center transition-all ${validRupas.utuja ? 'bg-orange-50 border-orange-200 text-orange-800 shadow-sm hover:scale-[1.02]' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${validRupas.utuja ? 'bg-orange-200 text-orange-700' : 'bg-slate-200 text-slate-500'}`}><Sun className="w-4 h-4"/></div>
                                        <span className="font-bold text-xs">Sắc do thời tiết</span>
                                        <span className="text-[10px] mt-1 opacity-80">{validRupas.utuja ? 'Do nhiệt độ/thời tiết tạo ra' : 'Không có'}</span>
                                    </div>
                                    <div className={`p-4 rounded-xl border-2 flex flex-col items-center text-center justify-center transition-all ${validRupas.aharaja ? 'bg-rose-50 border-rose-200 text-rose-800 shadow-sm hover:scale-[1.02]' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${validRupas.aharaja ? 'bg-rose-200 text-rose-700' : 'bg-slate-200 text-slate-500'}`}><Apple className="w-4 h-4"/></div>
                                        <span className="font-bold text-xs">Sắc do vật thực</span>
                                        <span className="text-[10px] mt-1 opacity-80">{validRupas.aharaja ? 'Do dinh dưỡng tạo ra' : 'Không có'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : khandhaViewIndex === 2 ? (
        isPaticcaActive ? (
          <div className="bg-pink-50 rounded-xl p-4 border-2 border-pink-200 flex flex-col items-center justify-center text-center h-full">
            {paticcaStep === 1 && isVipaka && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân quá khứ</p>
                <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Vô minh, Ái, Thủ</div>
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                <div className="bg-pink-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-pink-300 animate-pulse font-bold text-sm">Thọ uẩn</div>
              </div>
            )}
            {paticcaStep === 2 && isVipaka && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân quá khứ</p>
                <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Hành, Nghiệp</div>
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                <div className="bg-pink-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-pink-300 animate-pulse font-bold text-sm">Thọ uẩn</div>
              </div>
            )}
            {paticcaStep === 3 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                {paticcaLockedNodeData?.aramana && <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Cảnh: {paticcaLockedNodeData.aramana}</div>}
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                <div className="bg-pink-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-pink-300 animate-pulse font-bold text-sm">Thọ uẩn</div>
              </div>
            )}
            {paticcaStep === 4 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                {paticcaLockedNodeData?.base && <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Căn (Vật): {paticcaLockedNodeData.base}</div>}
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                <div className="bg-pink-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-pink-300 animate-pulse font-bold text-sm">Thọ uẩn</div>
              </div>
            )}
            {paticcaStep === 5 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                <div className="bg-pink-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
    <span>Xúc</span> 
    <span className="text-xs font-normal opacity-80">
        = {toMyanmarNum((paticcaLockedNodeData?.count || activeNode.count || 1) - 1)} loại
    </span>
</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {(paticcaLockedNodeData?.cetasikas || []).filter(c => !c.includes("Thọ") && !c.includes("ဝေဒနာ")).map((c, i) => (
                    <span key={i} className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${getCetasikaStyle(c)}`}>{c}</span>
                  ))}
                </div>
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                <div className="bg-pink-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-pink-300 animate-pulse font-bold text-sm">Thọ uẩn</div>
              </div>
            )}
            {paticcaStep === 7 && (() => {
              let specialCause = "";
              const cName = paticcaCittaName || activeNode.name;
              if (cName.includes("Nhãn thức") || cName.includes("Nhãn thức")) specialCause = "Ánh sáng (Āloka)";
              else if (cName.includes("Nhĩ thức") || cName.includes("Nhĩ thức")) specialCause = "Hư không (Ākāsa)";
              else if (cName.includes("Tỷ thức") || cName.includes("Tỷ thức")) specialCause = "Gió (Vāta)";
              else if (cName.includes("Thiệt thức") || cName.includes("Thiệt thức")) specialCause = "Nước (Āpo)";
              else if (cName.includes("Thân thức") || cName.includes("Thân thức")) specialCause = "Đất cứng (Thaddha pathavī)";
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : isSankhara ? "Hành uẩn" : "Hành uẩn (Tư)";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-amber-500 ring-amber-300";
              const arrowColor = isSankhara ? "text-emerald-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : "text-pink-700";

              return specialCause ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">{specialCause}</div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>{cName} Tâm</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 8 && (() => {
              const cName = paticcaCittaName || activeNode.name;
              let manasikaraName = "";
              if (["Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức", "Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức"].some(v => cName.includes(v))) {
                  manasikaraName = "Tâm Ngũ môn hướng tâm";
              } else {
                  const vithiName = paticcaLockedNodeData?.vithi || activeNode.vithi || "";
                  if (vithiName.includes("Ý môn") || vithiName.includes("An chỉ") || vithiName.includes("မနောဒွါရ") || vithiName.includes("အပ္ပနာ")) manasikaraName = "Tâm Ý môn hướng tâm";
                  else manasikaraName = "Tâm Phân đoán";
              }
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
              const isVinnana = khandhaViewIndex === 5;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : khandhaViewIndex === 6 ? "Hành uẩn (Tư)" : isSankhara ? "Hành uẩn" : "Thức uẩn";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-indigo-500 ring-indigo-300";
              const arrowColor = isSankhara ? "text-emerald-500" : isVinnana ? "text-indigo-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : isVinnana ? "text-indigo-700" : "text-pink-700";

              return manasikaraName ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                      <span>Tác ý</span>
                      <span className="text-xs font-normal opacity-80">({manasikaraName})</span>
                  </div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>{cName} Tâm</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 9 && (() => {
              const targetCitta = paticcaCittaName;
              let samphassaName = activeNode.name.replace("thức", "xúc").replace("ဝိညာဏ်", "သမ္ဖဿ");
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
              const isVinnana = khandhaViewIndex === 5;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : khandhaViewIndex === 6 ? "Hành uẩn (Tư)" : isSankhara ? "Hành uẩn" : "Thức uẩn";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-indigo-500 ring-indigo-300";
              const arrowColor = isSankhara ? "text-emerald-500" : isVinnana ? "text-indigo-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : isVinnana ? "text-indigo-700" : "text-pink-700";

              return samphassaName ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-fuchsia-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                      <span>{samphassaName}</span>
                      <span className="text-xs font-normal opacity-80">({activeNode.name} Tâm)</span>
                  </div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>{targetCitta} Tâm</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 10 && (() => {
    const kLabel = khandhaViewIndex === 2 ? "Thọ uẩn"
        : khandhaViewIndex === 3 ? "Tưởng uẩn"
        : khandhaViewIndex === 4 ? "Hành uẩn"
        : khandhaViewIndex === 5 ? "Thức uẩn"
        : "Hành uẩn (Tư)";
    const kColor = khandhaViewIndex === 2 ? "bg-pink-500 ring-pink-300"
        : khandhaViewIndex === 3 ? "bg-amber-500 ring-amber-300"
        : khandhaViewIndex === 4 ? "bg-emerald-500 ring-emerald-300"
        : khandhaViewIndex === 5 ? "bg-indigo-500 ring-indigo-300"
        : "bg-amber-500 ring-amber-300";
    
    const prevCount = activeNode.count || 0;
    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
            <div className="bg-violet-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                <span>{preSamphassaLabel}</span>
                <span className="text-xs font-normal opacity-80">
                    ({activeNode.name}) = {toMyanmarNum(prevCount)} loại
                </span>
            </div>
            <ArrowDown className="text-violet-500 w-8 h-8 animate-bounce" />
            <p className="text-violet-700 font-bold text-sm">{paticcaCittaName} Tâm</p>
            <div className={`${kColor} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>
                {kLabel}
            </div>
        </div>
    );
})()}
            {paticcaStep === 6 && (() => {
    const bhvCetasikas = (currentBhavangaGroup.options?.[bhavangaSubIndex] || currentBhavangaGroup.options?.[0])?.cetasikas || [];
    const bhvCount = bhvCetasikas.length;
    const kLabel = khandhaViewIndex === 2 ? "Thọ uẩn"
        : khandhaViewIndex === 3 ? "Tưởng uẩn"
        : khandhaViewIndex === 4 ? "Hành uẩn"
        : khandhaViewIndex === 5 ? "Thức uẩn"
        : "Hành uẩn (Tư)";
    const kColor = khandhaViewIndex === 2 ? "bg-pink-500 ring-pink-300"
        : khandhaViewIndex === 3 ? "bg-amber-500 ring-amber-300"
        : khandhaViewIndex === 4 ? "bg-emerald-500 ring-emerald-300"
        : khandhaViewIndex === 5 ? "bg-indigo-500 ring-indigo-300"
        : "bg-amber-500 ring-amber-300";
    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
            <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                <span>Hữu phần Ý xúc</span>
                <span className="text-xs font-normal opacity-80">
                    = {toMyanmarNum(bhvCount)} loại (Tâm 1 + Tâm sở {toMyanmarNum(bhvCount - 1)})
                </span>
            </div>
            <ArrowDown className="text-indigo-500 w-8 h-8 animate-bounce" />
            <p className="text-indigo-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
            <div className={`${kColor} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>
                {kLabel}
            </div>
        </div>
    );
})()}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 p-2 rounded-lg border-2 border-pink-200 bg-pink-50/50" title="Thọ uẩn">
                            {vedanaGroup.map((c, i) => <CetasikaBtn key={`v-${i}`} cName={c} label={c.replace('Thọ', 'Thọ uẩn').replace('ဝေဒနာ', 'Thọ uẩn')} />)}
                          </div>
                        )
                    ) : khandhaViewIndex === 3 ? (
                        isPaticcaActive ? (
                          <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200 flex flex-col items-center justify-center text-center h-full">
                            {paticcaStep === 1 && isVipaka && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân quá khứ</p>
                <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Vô minh, Ái, Thủ</div>
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-amber-300 animate-pulse font-bold text-sm">Tưởng uẩn</div>
              </div>
            )}
            {paticcaStep === 2 && isVipaka && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân quá khứ</p>
                <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Hành, Nghiệp</div>
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-amber-300 animate-pulse font-bold text-sm">Tưởng uẩn</div>
              </div>
            )}
            {paticcaStep === 3 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                {paticcaLockedNodeData?.aramana && <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Cảnh: {paticcaLockedNodeData.aramana}</div>}
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-amber-300 animate-pulse font-bold text-sm">Tưởng uẩn</div>
              </div>
            )}
            {paticcaStep === 4 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                {paticcaLockedNodeData?.base && <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Căn (Vật): {paticcaLockedNodeData.base}</div>}
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-amber-300 animate-pulse font-bold text-sm">Tưởng uẩn</div>
              </div>
            )}
            {paticcaStep === 5 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                <div className="bg-pink-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
    <span>Xúc</span>
    <span className="text-xs font-normal opacity-80">
        = {toMyanmarNum((paticcaLockedNodeData?.count || activeNode.count || 1) - 1)} loại
    </span>
</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {(paticcaLockedNodeData?.cetasikas || []).filter(c => c !== "Tưởng" && c !== "သညာ").map((c, i) => (
                    <span key={i} className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${getCetasikaStyle(c)}`}>{c}</span>
                  ))}
                </div>
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-amber-300 animate-pulse font-bold text-sm">Tưởng uẩn</div>
              </div>
            )}
            {paticcaStep === 7 && (() => {
              let specialCause = "";
              const cName = paticcaCittaName || activeNode.name;
              if (cName.includes("Nhãn thức") || cName.includes("Nhãn thức")) specialCause = "Ánh sáng (Āloka)";
              else if (cName.includes("Nhĩ thức") || cName.includes("Nhĩ thức")) specialCause = "Hư không (Ākāsa)";
              else if (cName.includes("Tỷ thức") || cName.includes("Tỷ thức")) specialCause = "Gió (Vāta)";
              else if (cName.includes("Thiệt thức") || cName.includes("Thiệt thức")) specialCause = "Nước (Āpo)";
              else if (cName.includes("Thân thức") || cName.includes("Thân thức")) specialCause = "Đất cứng (Thaddha pathavī)";
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : isSankhara ? "Hành uẩn" : "Hành uẩn (Tư)";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-amber-500 ring-amber-300";
              const arrowColor = isSankhara ? "text-emerald-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : "text-pink-700";

              return specialCause ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">{specialCause}</div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>{cName} Tâm</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 8 && (() => {
              const cName = paticcaCittaName || activeNode.name;
              let manasikaraName = "";
              if (["Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức", "Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức"].some(v => cName.includes(v))) {
                  manasikaraName = "Tâm Ngũ môn hướng tâm";
              } else {
                  const vithiName = paticcaLockedNodeData?.vithi || activeNode.vithi || "";
                  if (vithiName.includes("Ý môn") || vithiName.includes("An chỉ") || vithiName.includes("မနောဒွါရ") || vithiName.includes("အပ္ပနာ")) manasikaraName = "Tâm Ý môn hướng tâm";
                  else manasikaraName = "Tâm Phân đoán";
              }
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
              const isVinnana = khandhaViewIndex === 5;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : khandhaViewIndex === 6 ? "Hành uẩn (Tư)" : isSankhara ? "Hành uẩn" : "Thức uẩn";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-indigo-500 ring-indigo-300";
              const arrowColor = isSankhara ? "text-emerald-500" : isVinnana ? "text-indigo-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : isVinnana ? "text-indigo-700" : "text-pink-700";

              return manasikaraName ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                      <span>Tác ý</span>
                      <span className="text-xs font-normal opacity-80">({manasikaraName})</span>
                  </div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>{cName} Tâm</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 9 && (() => {
              const targetCitta = paticcaCittaName;
              let samphassaName = activeNode.name.replace("thức", "xúc").replace("ဝိညာဏ်", "သမ္ဖဿ");
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
              const isVinnana = khandhaViewIndex === 5;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : khandhaViewIndex === 6 ? "Hành uẩn (Tư)" : isSankhara ? "Hành uẩn" : "Thức uẩn";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-indigo-500 ring-indigo-300";
              const arrowColor = isSankhara ? "text-emerald-500" : isVinnana ? "text-indigo-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : isVinnana ? "text-indigo-700" : "text-pink-700";

              return samphassaName ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-fuchsia-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                      <span>{samphassaName}</span>
                      <span className="text-xs font-normal opacity-80">({activeNode.name} Tâm)</span>
                  </div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>{targetCitta} Tâm</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 10 && (() => {
    const kLabel = khandhaViewIndex === 2 ? "Thọ uẩn"
        : khandhaViewIndex === 3 ? "Tưởng uẩn"
        : khandhaViewIndex === 4 ? "Hành uẩn"
        : khandhaViewIndex === 5 ? "Thức uẩn"
        : "Hành uẩn (Tư)";
    const kColor = khandhaViewIndex === 2 ? "bg-pink-500 ring-pink-300"
        : khandhaViewIndex === 3 ? "bg-amber-500 ring-amber-300"
        : khandhaViewIndex === 4 ? "bg-emerald-500 ring-emerald-300"
        : khandhaViewIndex === 5 ? "bg-indigo-500 ring-indigo-300"
        : "bg-amber-500 ring-amber-300";
    
    const prevCount = activeNode.count || 0;
    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
            <div className="bg-violet-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                <span>{preSamphassaLabel}</span>
                <span className="text-xs font-normal opacity-80">
                    ({activeNode.name}) = {toMyanmarNum(prevCount)} loại
                </span>
            </div>
            <ArrowDown className="text-violet-500 w-8 h-8 animate-bounce" />
            <p className="text-violet-700 font-bold text-sm">{paticcaCittaName} Tâm</p>
            <div className={`${kColor} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>
                {kLabel}
            </div>
        </div>
    );
})()}
            {paticcaStep === 6 && (() => {
    const bhvCetasikas = (currentBhavangaGroup.options?.[bhavangaSubIndex] || currentBhavangaGroup.options?.[0])?.cetasikas || [];
    const bhvCount = bhvCetasikas.length;
    const kLabel = khandhaViewIndex === 2 ? "Thọ uẩn"
        : khandhaViewIndex === 3 ? "Tưởng uẩn"
        : khandhaViewIndex === 4 ? "Hành uẩn"
        : khandhaViewIndex === 5 ? "Thức uẩn"
        : "Hành uẩn (Tư)";
    const kColor = khandhaViewIndex === 2 ? "bg-pink-500 ring-pink-300"
        : khandhaViewIndex === 3 ? "bg-amber-500 ring-amber-300"
        : khandhaViewIndex === 4 ? "bg-emerald-500 ring-emerald-300"
        : khandhaViewIndex === 5 ? "bg-indigo-500 ring-indigo-300"
        : "bg-amber-500 ring-amber-300";
    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
            <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                <span>Hữu phần Ý xúc</span>
                <span className="text-xs font-normal opacity-80">
                    = {toMyanmarNum(bhvCount)} loại (Tâm 1 + Tâm sở {toMyanmarNum(bhvCount - 1)})
                </span>
            </div>
            <ArrowDown className="text-indigo-500 w-8 h-8 animate-bounce" />
            <p className="text-indigo-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
            <div className={`${kColor} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>
                {kLabel}
            </div>
        </div>
    );
})()}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 p-2 rounded-lg border-2 border-amber-200 bg-amber-50/50" title="Tưởng uẩn">
                            {sannaGroup.map((c, i) => <CetasikaBtn key={`s-${i}`} cName={c} label="Tưởng uẩn" />)}
                          </div>
                        )
                    ) : khandhaViewIndex === 4 ? (
                        isPaticcaActive ? (() => {
                          const tLabel = sankharaOnlyCetana ? "Hành uẩn (Tư)" : "Hành uẩn";
                          return (
                            <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200 flex flex-col items-center justify-center text-center h-full">
                              {(paticcaStep === 1) && (isVipaka ? (
                                <div className="flex flex-col items-center gap-3">
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân quá khứ</p>
                                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Vô minh, Ái, Thủ</div>
                                  <ArrowDown className="text-emerald-500 w-8 h-8 animate-bounce" />
                                  <p className="text-emerald-700 font-bold text-sm">{paticcaCittaName} Tâm</p>
                                  <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-emerald-300 animate-pulse font-bold text-sm">{tLabel}</div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-3">
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                                  <div className="bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Cảnh: {paticcaLockedNodeData?.aramana}</div>
                                  <ArrowDown className="text-emerald-500 w-8 h-8 animate-bounce" />
                                  <p className="text-emerald-700 font-bold text-sm">{paticcaCittaName} Tâm</p>
                                  <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-emerald-300 animate-pulse font-bold text-sm">{tLabel}</div>
                                </div>
                              ))}
                              {(paticcaStep === 2) && (isVipaka ? (
                                <div className="flex flex-col items-center gap-3">
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân quá khứ</p>
                                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Hành, Nghiệp</div>
                                  <ArrowDown className="text-emerald-500 w-8 h-8 animate-bounce" />
                                  <p className="text-emerald-700 font-bold text-sm">{paticcaCittaName} Tâm</p>
                                  <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-emerald-300 animate-pulse font-bold text-sm">{tLabel}</div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-3">
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                                  <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Căn (Vật): {paticcaLockedNodeData?.base}</div>
                                  <ArrowDown className="text-emerald-500 w-8 h-8 animate-bounce" />
                                  <p className="text-emerald-700 font-bold text-sm">{paticcaCittaName} Tâm</p>
                                  <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-emerald-300 animate-pulse font-bold text-sm">{tLabel}</div>
                                </div>
                              ))}
                              {paticcaStep === 3 && (
                <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  {paticcaLockedNodeData?.aramana && <div className="bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Cảnh: {paticcaLockedNodeData.aramana}</div>}
                                  <ArrowDown className="text-emerald-500 w-8 h-8 animate-bounce" />
                                  <p className="text-emerald-700 font-bold text-sm">{paticcaCittaName} Tâm</p>
                                  <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-emerald-300 animate-pulse font-bold text-sm">{tLabel}</div>
                                </div>
                              )}
                              {(paticcaStep === 4) && (
                                <div className="flex flex-col items-center gap-3">
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                                  <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Căn (Vật): {paticcaLockedNodeData?.base}</div>
                                  <ArrowDown className="text-emerald-500 w-8 h-8 animate-bounce" />
                                  <p className="text-emerald-700 font-bold text-sm">{paticcaCittaName} Tâm</p>
                                  <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-emerald-300 animate-pulse font-bold text-sm">{tLabel}</div>
                                </div>
                              )}
                              {paticcaStep === 5 && (
                                <div className="flex flex-col items-center gap-3">
                                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                <div className="bg-pink-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Xúc</div>
                <div className="flex flex-wrap gap-1 justify-center">
                                    {(paticcaLockedNodeData?.cetasikas || []).filter(c => c === "Tâm" || c.includes("Thọ") || c.includes("ဝေဒနာ") || c === "Tưởng" || c === "သညာ" || c === "Tâm").map((c, i) => (
                                      <span key={i} className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${getCetasikaStyle(c)}`}>{c}</span>
                                    ))}
                                  </div>
                                  <ArrowDown className="text-emerald-500 w-8 h-8 animate-bounce" />
                                  <p className="text-emerald-700 font-bold text-sm">{paticcaCittaName} Tâm</p>
                                  <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-emerald-300 animate-pulse font-bold text-sm">{tLabel}</div>
                                </div>
                              )}
                              {paticcaStep === 7 && (() => {
              let specialCause = "";
              const cName = paticcaCittaName || activeNode.name;
              if (cName.includes("Nhãn thức") || cName.includes("Nhãn thức")) specialCause = "Ánh sáng (Āloka)";
              else if (cName.includes("Nhĩ thức") || cName.includes("Nhĩ thức")) specialCause = "Hư không (Ākāsa)";
              else if (cName.includes("Tỷ thức") || cName.includes("Tỷ thức")) specialCause = "Gió (Vāta)";
              else if (cName.includes("Thiệt thức") || cName.includes("Thiệt thức")) specialCause = "Nước (Āpo)";
              else if (cName.includes("Thân thức") || cName.includes("Thân thức")) specialCause = "Đất cứng (Thaddha pathavī)";
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : isSankhara ? "Hành uẩn" : "Hành uẩn (Tư)";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-amber-500 ring-amber-300";
              const arrowColor = isSankhara ? "text-emerald-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : "text-pink-700";

              return specialCause ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">{specialCause}</div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>{cName} Tâm</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 8 && (() => {
              const cName = paticcaCittaName || activeNode.name;
              let manasikaraName = "";
              if (["Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức", "Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức"].some(v => cName.includes(v))) {
                  manasikaraName = "Tâm Ngũ môn hướng tâm";
              } else {
                  const vithiName = paticcaLockedNodeData?.vithi || activeNode.vithi || "";
                  if (vithiName.includes("Ý môn") || vithiName.includes("An chỉ") || vithiName.includes("မနောဒွါရ") || vithiName.includes("အပ္ပနာ")) manasikaraName = "Tâm Ý môn hướng tâm";
                  else manasikaraName = "Tâm Phân đoán";
              }
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
              const isVinnana = khandhaViewIndex === 5;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : khandhaViewIndex === 6 ? "Hành uẩn (Tư)" : isSankhara ? "Hành uẩn" : "Thức uẩn";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-indigo-500 ring-indigo-300";
              const arrowColor = isSankhara ? "text-emerald-500" : isVinnana ? "text-indigo-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : isVinnana ? "text-indigo-700" : "text-pink-700";

              return manasikaraName ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                      <span>Tác ý</span>
                      <span className="text-xs font-normal opacity-80">({manasikaraName})</span>
                  </div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>{cName} Tâm</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 9 && (() => {
              const targetCitta = paticcaCittaName;
              let samphassaName = activeNode.name.replace("thức", "xúc").replace("ဝိညာဏ်", "သမ္ဖဿ");
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
              const isVinnana = khandhaViewIndex === 5;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : khandhaViewIndex === 6 ? "Hành uẩn (Tư)" : isSankhara ? "Hành uẩn" : "Thức uẩn";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-indigo-500 ring-indigo-300";
              const arrowColor = isSankhara ? "text-emerald-500" : isVinnana ? "text-indigo-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : isVinnana ? "text-indigo-700" : "text-pink-700";

              return samphassaName ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-fuchsia-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                      <span>{samphassaName}</span>
                      <span className="text-xs font-normal opacity-80">({activeNode.name} Tâm)</span>
                  </div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>{targetCitta} Tâm</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 10 && (() => {
    const kLabel = khandhaViewIndex === 2 ? "Thọ uẩn"
        : khandhaViewIndex === 3 ? "Tưởng uẩn"
        : khandhaViewIndex === 4 ? "Hành uẩn"
        : khandhaViewIndex === 5 ? "Thức uẩn"
        : "Hành uẩn (Tư)";
    const kColor = khandhaViewIndex === 2 ? "bg-pink-500 ring-pink-300"
        : khandhaViewIndex === 3 ? "bg-amber-500 ring-amber-300"
        : khandhaViewIndex === 4 ? "bg-emerald-500 ring-emerald-300"
        : khandhaViewIndex === 5 ? "bg-indigo-500 ring-indigo-300"
        : "bg-amber-500 ring-amber-300";
    
    const prevCount = activeNode.count || 0;
    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
            <div className="bg-violet-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                <span>{preSamphassaLabel}</span>
                <span className="text-xs font-normal opacity-80">
                    ({activeNode.name}) = {toMyanmarNum(prevCount)} loại
                </span>
            </div>
            <ArrowDown className="text-violet-500 w-8 h-8 animate-bounce" />
            <p className="text-violet-700 font-bold text-sm">{paticcaCittaName} Tâm</p>
            <div className={`${kColor} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>
                {kLabel}
            </div>
        </div>
    );
})()}
                              {paticcaStep === 6 && (() => {
    const bhvCetasikas = (currentBhavangaGroup.options?.[bhavangaSubIndex] || currentBhavangaGroup.options?.[0])?.cetasikas || [];
    const bhvCount = bhvCetasikas.length;
    const kLabel = khandhaViewIndex === 2 ? "Thọ uẩn"
        : khandhaViewIndex === 3 ? "Tưởng uẩn"
        : khandhaViewIndex === 4 ? "Hành uẩn"
        : khandhaViewIndex === 5 ? "Thức uẩn"
        : "Hành uẩn (Tư)";
    const kColor = khandhaViewIndex === 2 ? "bg-pink-500 ring-pink-300"
        : khandhaViewIndex === 3 ? "bg-amber-500 ring-amber-300"
        : khandhaViewIndex === 4 ? "bg-emerald-500 ring-emerald-300"
        : khandhaViewIndex === 5 ? "bg-indigo-500 ring-indigo-300"
        : "bg-amber-500 ring-amber-300";
    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
            <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                <span>Hữu phần Ý xúc</span>
                <span className="text-xs font-normal opacity-80">
                    = {toMyanmarNum(bhvCount)} loại (Tâm 1 + Tâm sở {toMyanmarNum(bhvCount - 1)})
                </span>
            </div>
            <ArrowDown className="text-indigo-500 w-8 h-8 animate-bounce" />
            <p className="text-indigo-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
            <div className={`${kColor} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>
                {kLabel}
            </div>
        </div>
    );
})()}
                            </div>
                          );
                        })() : (
                          <div className="flex flex-wrap gap-1 p-2 rounded-lg border-2 border-emerald-200 bg-emerald-50/50" title="Hành uẩn">
                            {sankharaPrimary.map((c, i) => (
                              <button key={`sp-${i}`}
                                onClick={() => setSelectedCetasika(c)}
                                onMouseEnter={() => handleMouseEnter(c)}
                                onMouseLeave={handleMouseLeave}
                                className={`px-2 py-1 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-[11px] transition-all duration-200 border cursor-pointer hover:-translate-y-0.5 ${getCetasikaStyle(c)}`}>
                                Hành uẩn (Tư)
                              </button>
                            ))}
                            {sankharaSecondary.map((c, i) => <CetasikaBtn key={`ss-${i}`} cName={c} label={c} />)}
                          </div>
                        )
                    ) : khandhaViewIndex === 5 ? (
                        isPaticcaActive ? (
                          <div className="bg-indigo-50 rounded-xl p-4 border-2 border-indigo-200 flex flex-col items-center justify-center text-center h-full">
                            {/* ဝိပါက်ဝိညာဏ် ဆိုရင် step 1,2,3 */}
                            {paticcaStep === 1 && isVipaka && (
                              <div className="flex flex-col items-center gap-3">
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân quá khứ</p>
                                <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Vô minh, Ái, Thủ</div>
                                <ArrowDown className="text-indigo-500 w-8 h-8 animate-bounce" />
                                <p className="text-indigo-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                                <div className="bg-indigo-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-indigo-300 animate-pulse font-bold text-sm">Thức uẩn</div>
                              </div>
                            )}
                            {paticcaStep === 2 && isVipaka && (
                              <div className="flex flex-col items-center gap-3">
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân quá khứ</p>
                                <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Hành, Nghiệp</div>
                                <ArrowDown className="text-indigo-500 w-8 h-8 animate-bounce" />
                                <p className="text-indigo-700 font-bold text-sm">{paticcaCittaName || activeNode.name} Tâm</p>
                                <div className="bg-indigo-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-indigo-300 animate-pulse font-bold text-sm">Thức uẩn</div>
                              </div>
                            )}
                            {paticcaStep === 3 && (() => {
                              const lockedNode = paticcaLockedNodeData || activeNode;
                              const nonVipakaC = lockedNode.cetasikas?.filter(c => c !== "Tâm" && c !== "Tâm") || [];
                              const aramana = lockedNode.aramana || "";
                              const base = lockedNode.base || "";
                              const baseLabel = base && base !== "Không" && base !== "Không" ? base.replace(/-[0-9]+$/, "").replace(/-[0-9]+$/, "") : "";
                              return (
                                <div className="flex flex-col items-center gap-3">
                                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                                  <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Danh Sắc</div>
                                  <div className="flex flex-wrap gap-1 justify-center">
                                    {nonVipakaC.map((c, i) => (
                                      <span key={i} className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${getCetasikaStyle(c)}`}>{c}</span>
                                    ))}
                                    {aramana && <span className="px-1.5 py-0.5 rounded text-[11px] font-bold border bg-amber-100 text-amber-800 border-amber-300">Đối tượng: {aramana}</span>}
                                    {baseLabel && <span className="px-1.5 py-0.5 rounded text-[11px] font-bold border bg-indigo-100 text-indigo-800 border-indigo-300">Cơ sở: {baseLabel}</span>}
                                </div>
                                <ArrowDown className="text-indigo-500 w-8 h-8 animate-bounce" />
                                <p className="text-indigo-700 font-bold text-sm">Tâm {paticcaCittaName || activeNode.name}</p>
                                <div className="bg-indigo-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-indigo-300 animate-pulse font-bold text-sm">Thức uẩn</div>
                              </div>
                            );
                            })()}
                            {paticcaStep === 4 && (() => {
                              let specialCause = "";
                              const cName = paticcaCittaName || activeNode.name;
                              if (cName.includes("Nhãn thức") || cName.includes("Nhãn thức")) specialCause = "Ánh sáng (Āloka)";
                              else if (cName.includes("Nhĩ thức") || cName.includes("Nhĩ thức")) specialCause = "Hư không (Ākāsa)";
                              else if (cName.includes("Tỷ thức") || cName.includes("Tỷ thức")) specialCause = "Gió (Vāta)";
                              else if (cName.includes("Thiệt thức") || cName.includes("Thiệt thức")) specialCause = "Nước (Āpo)";
                              else if (cName.includes("Thân thức") || cName.includes("Thân thức")) specialCause = "Đất cứng (Thaddha pathavī)";

                              return specialCause ? (
                                <div className="flex flex-col items-center gap-3">
                                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">
                                    {specialCause}
                                  </div>
                                  <ArrowDown className="text-indigo-500 w-8 h-8 animate-bounce" />
                                  <p className="text-indigo-700 font-bold text-sm">Tâm {cName}</p>
                                  <div className="bg-indigo-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-indigo-300 animate-pulse font-bold text-sm">Thức uẩn</div>
                                </div>
                              ) : null;
                            })()}
                            {paticcaStep === 7 && (() => {
              let specialCause = "";
              const cName = paticcaCittaName || activeNode.name;
              if (cName.includes("Nhãn thức") || cName.includes("Nhãn thức")) specialCause = "Ánh sáng (Āloka)";
              else if (cName.includes("Nhĩ thức") || cName.includes("Nhĩ thức")) specialCause = "Hư không (Ākāsa)";
              else if (cName.includes("Tỷ thức") || cName.includes("Tỷ thức")) specialCause = "Gió (Vāta)";
              else if (cName.includes("Thiệt thức") || cName.includes("Thiệt thức")) specialCause = "Nước (Āpo)";
              else if (cName.includes("Thân thức") || cName.includes("Thân thức")) specialCause = "Đất cứng (Thaddha pathavī)";
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : isSankhara ? "Hành uẩn" : "Hành uẩn (Tác ý)";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-amber-500 ring-amber-300";
              const arrowColor = isSankhara ? "text-emerald-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : "text-pink-700";

              return specialCause ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">{specialCause}</div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>Tâm {cName}</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 8 && (() => {
              const cName = paticcaCittaName || activeNode.name;
              let manasikaraName = "";
              if (["Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức"].some(v => cName.includes(v))) {
                  manasikaraName = "Tâm hướng ngũ môn";
              } else {
                  const vithiName = paticcaLockedNodeData?.vithi || activeNode.vithi || "";
                  if (vithiName.includes("မနောဒွါရ") || vithiName.includes("အပ္ပနာ")) manasikaraName = "Tâm hướng ý môn";
                  else manasikaraName = "Tâm khai ý môn (Vũthạo)";
              }
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
              const isVinnana = khandhaViewIndex === 5;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : khandhaViewIndex === 6 ? "Hành uẩn (Tác ý)" : isSankhara ? "Hành uẩn" : "Thức uẩn";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-indigo-500 ring-indigo-300";
              const arrowColor = isSankhara ? "text-emerald-500" : isVinnana ? "text-indigo-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : isVinnana ? "text-indigo-700" : "text-pink-700";

              return manasikaraName ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                      <span>Tác ý (Manasikāra)</span>
                      <span className="text-xs font-normal opacity-80">({manasikaraName})</span>
                  </div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>Tâm {cName}</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 9 && (() => {
              const targetCitta = paticcaCittaName;
              let samphassaName = activeNode.name.replace("ဝိညာဏ်", "သမ္ဖဿ");
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
              const isVinnana = khandhaViewIndex === 5;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : khandhaViewIndex === 6 ? "Hành uẩn (Tác ý)" : isSankhara ? "Hành uẩn" : "Thức uẩn";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-indigo-500 ring-indigo-300";
              const arrowColor = isSankhara ? "text-emerald-500" : isVinnana ? "text-indigo-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : isVinnana ? "text-indigo-700" : "text-pink-700";

              return samphassaName ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-fuchsia-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                      <span>{samphassaName}</span>
                      <span className="text-xs font-normal opacity-80">(Tâm {activeNode.name})</span>
                  </div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>Tâm {targetCitta}</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 10 && (() => {
    const kLabel = khandhaViewIndex === 2 ? "Thọ uẩn"
        : khandhaViewIndex === 3 ? "Tưởng uẩn"
        : khandhaViewIndex === 4 ? "Hành uẩn"
        : khandhaViewIndex === 5 ? "Thức uẩn"
        : "Hành uẩn (Tác ý)";
    const kColor = khandhaViewIndex === 2 ? "bg-pink-500 ring-pink-300"
        : khandhaViewIndex === 3 ? "bg-amber-500 ring-amber-300"
        : khandhaViewIndex === 4 ? "bg-emerald-500 ring-emerald-300"
        : khandhaViewIndex === 5 ? "bg-indigo-500 ring-indigo-300"
        : "bg-amber-500 ring-amber-300";
    // activeNode က step 10 တွင် ရှေးစိတ်ကိုယ်တိုင် ဖြစ်နေသည်
    const prevCount = activeNode.count || 0;
    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
            <div className="bg-violet-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                <span>{preSamphassaLabel}</span>
                <span className="text-xs font-normal opacity-80">
                    ({activeNode.name}) = {toMyanmarNum(prevCount)} pháp
                </span>
            </div>
            <ArrowDown className="text-violet-500 w-8 h-8 animate-bounce" />
            <p className="text-violet-700 font-bold text-sm">Tâm {paticcaCittaName}</p>
            <div className={`${kColor} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>
                {kLabel}
            </div>
        </div>
    );
})()}
                            {paticcaStep === 6 && (() => {
    const bhvCetasikas = (currentBhavangaGroup.options?.[bhavangaSubIndex] || currentBhavangaGroup.options?.[0])?.cetasikas || [];
    const bhvCount = bhvCetasikas.length;
    const kLabel = khandhaViewIndex === 2 ? "Thọ uẩn"
        : khandhaViewIndex === 3 ? "Tưởng uẩn"
        : khandhaViewIndex === 4 ? "Hành uẩn"
        : khandhaViewIndex === 5 ? "Thức uẩn"
        : "Hành uẩn (Tác ý)";
    const kColor = khandhaViewIndex === 2 ? "bg-pink-500 ring-pink-300"
        : khandhaViewIndex === 3 ? "bg-amber-500 ring-amber-300"
        : khandhaViewIndex === 4 ? "bg-emerald-500 ring-emerald-300"
        : khandhaViewIndex === 5 ? "bg-indigo-500 ring-indigo-300"
        : "bg-amber-500 ring-amber-300";
    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
            <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                <span>Xúc tâm thức hộ pháp (Bhavanga Manosamphassa)</span>
                <span className="text-xs font-normal opacity-80">
                    = {toMyanmarNum(bhvCount)} pháp (1 tâm + {toMyanmarNum(bhvCount - 1)} sở hữu tâm)
                </span>
            </div>
            <ArrowDown className="text-indigo-500 w-8 h-8 animate-bounce" />
            <p className="text-indigo-700 font-bold text-sm">Tâm {paticcaCittaName || activeNode.name}</p>
            <div className={`${kColor} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>
                {kLabel}
            </div>
        </div>
    );
})()}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 p-2 rounded-lg border-2 border-indigo-200 bg-indigo-50/50" title="Thức uẩn">
                            {cittaGroup.map((c, i) => <CetasikaBtn key={`c-${i}`} cName={c} label="Thức uẩn" />)}
                          </div>
                        )
                        ) : khandhaViewIndex === 6 ? (
                        isPaticcaActive ? (
                          <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200 flex flex-col items-center justify-center text-center h-full">
                            {paticcaStep === 1 && isVipaka && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân quá khứ</p>
                <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Vô minh, Ái, Thủ</div>
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">Tâm {paticcaCittaName || activeNode.name}</p>
                <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-amber-300 animate-pulse font-bold text-sm">Hành uẩn (Tác ý)</div>
              </div>
            )}
            {paticcaStep === 2 && isVipaka && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân quá khứ</p>
                <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Hành, Nghiệp</div>
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">Tâm {paticcaCittaName || activeNode.name}</p>
                <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-amber-300 animate-pulse font-bold text-sm">Hành uẩn (Tác ý)</div>
              </div>
            )}
            {paticcaStep === 3 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                {paticcaLockedNodeData?.aramana && <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Đối tượng: {paticcaLockedNodeData.aramana}</div>}
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">Tâm {paticcaCittaName || activeNode.name}</p>
                <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-amber-300 animate-pulse font-bold text-sm">Hành uẩn (Tác ý)</div>
              </div>
            )}
            {paticcaStep === 4 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                {paticcaLockedNodeData?.base && <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">Cơ sở nương tựa: {paticcaLockedNodeData.base}</div>}
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">Tâm {paticcaCittaName || activeNode.name}</p>
                <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-amber-300 animate-pulse font-bold text-sm">Hành uẩn (Tác ý)</div>
              </div>
            )}
            {paticcaStep === 5 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                <div className="bg-pink-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
    <span>Xúc (Phassa)</span>
    <span className="text-xs font-normal opacity-80">
        = {toMyanmarNum((paticcaLockedNodeData?.count || activeNode.count || 1) - 1)} pháp
    </span>
</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {(paticcaLockedNodeData?.cetasikas || []).filter(c => c !== "စေတနာ").map((c, i) => (
                    <span key={i} className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${getCetasikaStyle(c)}`}>{c}</span>
                  ))}
                </div>
                <ArrowDown className="text-pink-500 w-8 h-8 animate-bounce" />
                <p className="text-pink-700 font-bold text-sm">Tâm {paticcaCittaName || activeNode.name}</p>
                <div className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-amber-300 animate-pulse font-bold text-sm">Hành uẩn (Tác ý)</div>
              </div>
            )}
            {paticcaStep === 7 && (() => {
              let specialCause = "";
              const cName = paticcaCittaName || activeNode.name;
              if (cName.includes("Nhãn thức") || cName.includes("Nhãn thức")) specialCause = "Ánh sáng (Āloka)";
              else if (cName.includes("Nhĩ thức") || cName.includes("Nhĩ thức")) specialCause = "Hư không (Ākāsa)";
              else if (cName.includes("Tỷ thức") || cName.includes("Tỷ thức")) specialCause = "Gió (Vāta)";
              else if (cName.includes("Thiệt thức") || cName.includes("Thiệt thức")) specialCause = "Nước (Āpo)";
              else if (cName.includes("Thân thức") || cName.includes("Thân thức")) specialCause = "Đất cứng (Thaddha pathavī)";
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : isSankhara ? "Hành uẩn" : "Hành uẩn (Tác ý)";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-amber-500 ring-amber-300";
              const arrowColor = isSankhara ? "text-emerald-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : "text-pink-700";

              return specialCause ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">{specialCause}</div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>Tâm {cName}</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 8 && (() => {
              const cName = paticcaCittaName || activeNode.name;
              let manasikaraName = "";
              if (["Nhãn thức", "Nhĩ thức", "Tỷ thức", "Thiệt thức", "Thân thức"].some(v => cName.includes(v))) {
                  manasikaraName = "Tâm hướng ngũ môn";
              } else {
                  const vithiName = paticcaLockedNodeData?.vithi || activeNode.vithi || "";
                  if (vithiName.includes("မနောဒွါရ") || vithiName.includes("အပ္ပနာ")) manasikaraName = "Tâm hướng ý môn";
                  else manasikaraName = "Tâm khai ý môn (Vũthạo)";
              }
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
              const isVinnana = khandhaViewIndex === 5;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : khandhaViewIndex === 6 ? "Hành uẩn (Tác ý)" : isSankhara ? "Hành uẩn" : "Thức uẩn";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-indigo-500 ring-indigo-300";
              const arrowColor = isSankhara ? "text-emerald-500" : isVinnana ? "text-indigo-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : isVinnana ? "text-indigo-700" : "text-pink-700";

              return manasikaraName ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                      <span>Tác ý (Manasikāra)</span>
                      <span className="text-xs font-normal opacity-80">({manasikaraName})</span>
                  </div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>Tâm {cName}</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 9 && (() => {
              const targetCitta = paticcaCittaName;
              let samphassaName = activeNode.name.replace("ဝိညာဏ်", "သမ္ဖဿ");
              
              const isVedana = khandhaViewIndex === 2;
              const isSanna = khandhaViewIndex === 3;
              const isSankhara = khandhaViewIndex === 4 || khandhaViewIndex === 6;
              const isVinnana = khandhaViewIndex === 5;
              
              const label = isVedana ? "Thọ uẩn" : isSanna ? "Tưởng uẩn" : khandhaViewIndex === 6 ? "Hành uẩn (Tác ý)" : isSankhara ? "Hành uẩn" : "Thức uẩn";
              const bgClass = isVedana ? "bg-pink-500 ring-pink-300" : isSanna ? "bg-amber-500 ring-amber-300" : isSankhara ? "bg-emerald-500 ring-emerald-300" : "bg-indigo-500 ring-indigo-300";
              const arrowColor = isSankhara ? "text-emerald-500" : isVinnana ? "text-indigo-500" : "text-pink-500";
              const textColor = isSankhara ? "text-emerald-700" : isVinnana ? "text-indigo-700" : "text-pink-700";

              return samphassaName ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                  <div className="bg-fuchsia-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                      <span>{samphassaName}</span>
                      <span className="text-xs font-normal opacity-80">(Tâm {activeNode.name})</span>
                  </div>
                  <ArrowDown className={`${arrowColor} w-8 h-8 animate-bounce`} />
                  <p className={`${textColor} font-bold text-sm`}>Tâm {targetCitta}</p>
                  <div className={`${bgClass} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>{label}</div>
                </div>
              ) : null;
            })()}
            {paticcaStep === 10 && (() => {
    const kLabel = khandhaViewIndex === 2 ? "Thọ uẩn"
        : khandhaViewIndex === 3 ? "Tưởng uẩn"
        : khandhaViewIndex === 4 ? "Hành uẩn"
        : khandhaViewIndex === 5 ? "Thức uẩn"
        : "Hành uẩn (Tác ý)";
    const kColor = khandhaViewIndex === 2 ? "bg-pink-500 ring-pink-300"
        : khandhaViewIndex === 3 ? "bg-amber-500 ring-amber-300"
        : khandhaViewIndex === 4 ? "bg-emerald-500 ring-emerald-300"
        : khandhaViewIndex === 5 ? "bg-indigo-500 ring-indigo-300"
        : "bg-amber-500 ring-amber-300";
    // activeNode က step 10 တွင် ရှေးစိတ်ကိုယ်တိုင် ဖြစ်နေသည်
    const prevCount = activeNode.count || 0;
    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
            <div className="bg-violet-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                <span>{preSamphassaLabel}</span>
                <span className="text-xs font-normal opacity-80">
                    ({activeNode.name}) = {toMyanmarNum(prevCount)} pháp
                </span>
            </div>
            <ArrowDown className="text-violet-500 w-8 h-8 animate-bounce" />
            <p className="text-violet-700 font-bold text-sm">Tâm {paticcaCittaName}</p>
            <div className={`${kColor} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>
                {kLabel}
            </div>
        </div>
    );
})()}
            {paticcaStep === 6 && (() => {
    const bhvCetasikas = (currentBhavangaGroup.options?.[bhavangaSubIndex] || currentBhavangaGroup.options?.[0])?.cetasikas || [];
    const bhvCount = bhvCetasikas.length;
    const kLabel = khandhaViewIndex === 2 ? "Thọ uẩn"
        : khandhaViewIndex === 3 ? "Tưởng uẩn"
        : khandhaViewIndex === 4 ? "Hành uẩn"
        : khandhaViewIndex === 5 ? "Thức uẩn"
        : "Hành uẩn (Tác ý)";
    const kColor = khandhaViewIndex === 2 ? "bg-pink-500 ring-pink-300"
        : khandhaViewIndex === 3 ? "bg-amber-500 ring-amber-300"
        : khandhaViewIndex === 4 ? "bg-emerald-500 ring-emerald-300"
        : khandhaViewIndex === 5 ? "bg-indigo-500 ring-indigo-300"
        : "bg-amber-500 ring-amber-300";
    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
            <div className="bg-slate-700 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm flex flex-col items-center gap-1">
                <span>Xúc tâm thức hộ pháp (Bhavanga Manosamphassa)</span>
                <span className="text-xs font-normal opacity-80">
                    = {toMyanmarNum(bhvCount)} pháp (1 tâm + {toMyanmarNum(bhvCount - 1)} sở hữu tâm)
                </span>
            </div>
            <ArrowDown className="text-indigo-500 w-8 h-8 animate-bounce" />
            <p className="text-indigo-700 font-bold text-sm">Tâm {paticcaCittaName || activeNode.name}</p>
            <div className={`${kColor} text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] animate-pulse font-bold text-sm`}>
                {kLabel}
            </div>
        </div>
    );
})()}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 p-2 rounded-lg border-2 border-amber-200 bg-amber-50/50" title="Hành uẩn (Tác ý)">
                            {sannaGroup.map((c, i) => <CetasikaBtn key={`s-${i}`} cName={c} label="Hành uẩn (Tác ý)" />)}
                          </div>
                        )
                    ) : (() => {
                                const lockedNode = paticcaLockedNodeData || activeNode;
                                const nonVipakaC = lockedNode.cetasikas?.filter(c => c !== "Tâm") || [];
                                const aramana = lockedNode.aramana || "";
                                const base = lockedNode.base || "";
                                const baseLabel = base && base !== "Không" ? base.replace(/-[0-9]+$/, "") : "";
                                return (
                                  <div className="flex flex-col items-center gap-3 w-full">
                                    <div className="flex flex-col items-center gap-2 w-full">
                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Nguyên nhân hiện tại</p>
                                      <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-md font-bold text-sm">
                                    Danh Sắc
                                  </div>
                                      <div className="flex gap-3 w-full justify-center items-start">
                                        <div className="flex flex-col items-center gap-1 flex-1">
                                          <p className="text-[10px] font-bold text-slate-500 mb-1">Danh</p>
                                          <div className="flex flex-wrap gap-1 justify-center">
                                            {nonVipakaC.map((c, i) => (
                                              <span key={i} className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getCetasikaStyle(c)}`}>{c}</span>
                                            ))}
                                            {aramana && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-amber-100 text-amber-800 border-amber-300">Đối tượng: {aramana}</span>}
                                            {baseLabel && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-indigo-100 text-indigo-800 border-indigo-300">Cơ sở: {baseLabel}</span>}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <ArrowDown className="text-indigo-500 w-8 h-8 animate-bounce" />
                                    <p className="text-indigo-700 font-bold text-sm">Tâm {paticcaCittaName || activeNode.name} (Thức uẩn)</p>
                                    <div className="bg-indigo-500 text-white px-6 py-3 rounded-lg shadow-lg ring-[4px] ring-indigo-300 animate-pulse font-bold text-sm">
                                      Thức uẩn
                                    </div>
                                  </div>
                                );
                              })()}
                  </div>

                </div>
              </div>

           </div>
        </div>

{/* --- Floating Play Controls --- */}
        <FloatingControls 
          handleReset={handleReset} 
          handlePrev={handlePrev} 
          togglePlay={togglePlay} 
          handleNext={handleNext} 
          isPlaying={isPlaying} 
          currentIndex={currentIndex} 
          totalLength={vithiData.length} 
        />

        {/* --- Modals --- */}
        {/* Base Rupa Modal */}
        {selectedBaseForModal && rupaBaseData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
              <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg md:text-xl flex items-center gap-2">
                  <Activity className="w-5 h-5"/> {rupaBaseData.title}
                </h3>
                <button onClick={() => setSelectedBaseForModal(null)} className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-indigo-500 transition">✕</button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rupaBaseData.list.map((kalapa, idx) => {
                    const Icon = kalapa.icon || Info;
                    return (
                      <div key={idx} className={`${kalapa.bg} p-4 rounded-xl border border-white shadow-sm hover:shadow-md transition-shadow`}>
                        <h4 className={`font-bold ${kalapa.color} mb-2 flex items-center gap-2`}>
                          <Icon className="w-4 h-4"/> {kalapa.title}
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                          {kalapa.elements}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-slate-100 px-6 py-3 flex justify-end border-t border-slate-200">
                <button onClick={() => setSelectedBaseForModal(null)} className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 shadow-sm transition">Đóng</button>
              </div>
            </div>
          </div>
        )}

        {/* Cetasika Info Modal */}
        {selectedCetasika && modalDisplayInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
              <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-xl">{modalDisplayInfo.name || selectedCetasika}</h3>
                <button onClick={() => setSelectedCetasika(null)} className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-indigo-500 transition">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {modalDisplayInfo.lakkana && (
                  <div>
                    <h4 className="text-xs font-bold text-indigo-500 uppercase mb-1">Tướng (Lakkhaṇa)</h4>
                    <p className="text-slate-800 font-medium">{modalDisplayInfo.lakkana}</p>
                  </div>
                )}
                {modalDisplayInfo.rasa && (
                  <div>
                    <h4 className="text-xs font-bold text-indigo-500 uppercase mb-1">Phận sự (Rasa)</h4>
                    <p className="text-slate-800 font-medium">{modalDisplayInfo.rasa}</p>
                  </div>
                )}
                {modalDisplayInfo.paccupatthana && (
                  <div>
                    <h4 className="text-xs font-bold text-indigo-500 uppercase mb-1">Biểu hiện (Paccupaṭṭhāna)</h4>
                    <p className="text-slate-800 font-medium">{modalDisplayInfo.paccupatthana}</p>
                  </div>
                )}
                {modalDisplayInfo.padatthana && (
                  <div>
                    <h4 className="text-xs font-bold text-indigo-500 uppercase mb-1">Nhân gần (Padaṭṭhāna)</h4>
                    <p className="text-slate-800 font-medium">{modalDisplayInfo.padatthana}</p>
                  </div>
                )}
              </div>
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
                <button onClick={() => setSelectedCetasika(null)} className="w-full py-2.5 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 transition">Đã hiểu</button>
              </div>
            </div>
          </div>
        )}

        {/* Prompt Input Modal */}
        {promptModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 p-6">
              <h3 className="font-bold text-lg text-slate-800 mb-4">Chỉnh sửa đối tượng (Ārammaṇa)</h3>
              <input 
                type="text" 
                value={promptModal.value}
                onChange={(e) => setPromptModal({ ...promptModal, value: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 mb-6"
                placeholder="Nhập đối tượng..."
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveArammana();
                }}
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setPromptModal({ isOpen: false, type: '', value: '' })} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition">Hủy</button>
                <button onClick={handleSaveArammana} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition shadow-sm">Lưu</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}