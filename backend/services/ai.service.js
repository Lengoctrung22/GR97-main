import OpenAI from "openai";

const AI_MOODS = {
  CHAT: "chatty",
  PROFESSIONAL: "professional",
};

const safetyNote =
  "Nếu có dấu hiệu nguy hiểm như đau ngực dữ dội, khó thở tăng dần, liệt nửa người, co giật, ngất, nôn ra máu hoặc đi ngoài ra máu, gọi 115 ngay.";

const emergencyRules = [
  {
    key: "Tim mạch cấp",
    keywords: ["đau ngực", "tức ngực", "khó thở", "vã mồ hôi", "đau lan lên tay", "đau lan lên hàm", "đau ngực trái", "đau ngực dữ dội", "tím môi", "lạnh chi"],
    advice: "Triệu chứng có thể liên quan tim mạch cấp. Ngừng hoạt động ngay, gọi 115 hoặc đến cơ sở cấp cứu gần nhất.",
  },
  {
    key: "Thần kinh cấp",
    keywords: ["liệt", "tê nửa người", "méo miệng", "khó nói", "nói ngọng", "mất ý thức", "co giật", "ngất", "mất ngôn ngữ", "mất thăng bằng"],
    advice: "Triệu chứng có nguy cơ đột quỵ/thần kinh cấp. Cần cấp cứu ngay để đánh giá trong giờ vàng.",
  },
  {
    key: "Xuất huyết nặng",
    keywords: ["chảy máu nhiều", "nôn ra máu", "đi ngoài ra máu", "phân đen", "ho ra máu", "chảy máu không cầm được", "chảy máu sau sinh"],
    advice: "Có dấu hiệu xuất huyết nặng. Cần đến khoa cấp cứu ngay, không tự điều trị tại nhà.",
  },
  {
    key: "Nhiễm trùng nặng",
    keywords: ["sốt cao liên tục", "lạnh run", "li bì", "thở nhanh", "tụt huyết áp", "sốt trên 39 độ", "sốt kèm phát ban", "sốt kèm đau bụng"],
    advice: "Có dấu hiệu nhiễm trùng nặng. Cần khám cấp cứu ngay để theo dõi sát.",
  },
  {
    key: "Sốc phản vệ",
    keywords: ["sưng môi", "sưng lưỡi", "khó thở sau tiêm", "sau uống thuốc", "phát ban toàn thân", "ngứa toàn thân", "chóng mặt sau ăn"],
    advice: "Có dấu hiệu sốc phản vệ. Gọi 115 ngay và nằm ngửa, chân nâng cao nếu có thể.",
  },
];

const symptomProfiles = [
  {
    name: "Hô hấp",
    specialty: "Nội hô hấp",
    keywords: ["ho", "đờm", "đau họng", "sốt", "ngạt mũi", "khó thở", "khó khăn tiếng", "đau ngực khi ho", "ho kéo dài", "ho về đêm", "hen", "viêm phổi", "viêm phế quản", "lao", "bụi phổi"],
    possibilities: ["viêm họng/viêm mũi xoang", "cảm cúm", "viêm phế quản", "hen phế quản", "viêm phổi", "lao phổi"],
    actions: [
      "Uống đủ nước ấm, nghỉ ngơi, giữ ấm cổ họng.",
      "Nếu sốt trên 38.5 độ C kéo dài qua 48 giờ hoặc khó thở tăng dần, cần khám ngay.",
      "Tránh khói bụi, không hút thuốc, giữ ấm cơ thể.",
    ],
    severity: {
      "ho kéo dài trên 3 tuần": "Cần khám chuyên khoa để loại trừ bệnh mãn tính.",
      "ho ra máu": "Cần khám cấp cứu ngay.",
      "khó thở tăng dần": "Cần đến bệnh viện ngay.",
    },
  },
  {
    name: "Tiêu hóa",
    specialty: "Nội tiêu hóa",
    keywords: ["đau bụng", "buồn nôn", "nôn", "tiêu chảy", "táo bón", "đầy hơi", "ăn không tiêu", "trào ngược", "ợ nóng", "đau dạ dày", "đau bụng quặn", "đau bụng dưới", "đau bụng trên", "chướng bụng", "đi cầu phân đen", "nôn ra máu"],
    possibilities: ["rối loạn tiêu hóa", "viêm dạ dày", "trào ngược dạ dày-thực quản", "ngộ độc thực phẩm", "hội chứng ruột kích thích", "viêm ruột thừa", "sỏi mật"],
    actions: [
      "Ăn mềm, tránh đồ cay nóng, bổ sung nước và điện giải nếu tiêu chảy.",
      "Nếu đau bụng tăng, nôn liên tục, sốt cao hoặc mất nước, cần đi khám ngay.",
      "Tránh ăn uống bừa bãi, nhai kỹ, không ăn quá no.",
    ],
    severity: {
      "đau bụng dữ dội không giảm": "Cần khám cấp cứu.",
      "nôn ra máu": "Cần đến bệnh viện ngay.",
      "đi ngoài ra máu": "Cần khám chuyên khoa.",
    },
  },
  {
    name: "Tim mạch",
    specialty: "Tim mạch",
    keywords: ["hồi hộp", "đánh trống ngực", "tăng huyết áp", "choáng váng", "phù chân", "khó thở khi nằm", "đau ngực", "tức ngực", "tim đập nhanh", "tim đập chậm", "huyết áp cao", "huyết áp thấp", "đau vai trái", "đau lan ra cánh tay"],
    possibilities: ["rối loạn nhịp tim", "tăng huyết áp", "suy tim giai đoạn sớm", "thiếu máu cơ tim cần loại trừ", "bệnh mạch vành"],
    actions: [
      "Nghỉ ngơi, hạn chế chất kích thích, theo dõi huyết áp và nhịp tim.",
      "Nếu đau ngực, khó thở hoặc choáng nặng, đến cấp cứu ngay.",
      "Hạn chế muối, giảm cân nếu thừa cân, tập thể dục đều đặn.",
    ],
    severity: {
      "đau ngực dữ dội": "Cần gọi 115 ngay - có thể nhồi máu cơ tim.",
      "đau ngực khi gắng sức": "Cần khám tim mạch sớm.",
      "mất ý thức đột ngột": "Cần cấp cứu ngay.",
    },
  },
  {
    name: "Thần kinh",
    specialty: "Thần kinh",
    keywords: ["đau đầu", "chóng mặt", "tê tay chân", "run", "mất ngủ", "giảm trí nhớ", "đau nửa đầu", "đau đầu vùng thái dương", "mất thăng bằng", "co giật", "tê bì chân tay", "đau dọc sống lưng", "đau thắt lưng"],
    possibilities: ["rối loạn tiền đình", "đau nửa đầu", "rối loạn giấc ngủ", "chèn ép thần kinh", "thoái hóa cột sống", "đau dây thần kinh tọa"],
    actions: [
      "Nghỉ ngơi trong không gian yên tĩnh, ngủ đủ giấc, uống đủ nước.",
      "Nếu đau đầu dữ dội, tê yếu tăng dần hoặc rối loạn ngôn ngữ, cần cấp cứu.",
      "Tránh căng thẳng, giảm caffeine, tập thể dục nhẹ.",
    ],
    severity: {
      "đau đầu dữ dội đột ngột": "Cần khám cấp cứu - có thể xuất huyết não.",
      "tê yếu một bên": "Cần đến bệnh viện ngay.",
      "co giật": "Cần khám chuyên khoa thần kinh.",
    },
  },
  {
    name: "Tiết niệu",
    specialty: "Thận - Tiết niệu",
    keywords: ["tiểu buốt", "tiểu rắt", "tiểu nhiều", "tiểu đêm", "đau hông lưng", "nước tiểu đục", "tiểu máu", "sỏi thận", "đau khi tiểu", "tiểu ít", "phù chân", "phù mặt"],
    possibilities: ["viêm đường tiết niệu", "viêm bàng quang", "sỏi tiết niệu", "viêm thận-bể thận", "suy thận"],
    actions: [
      "Uống đủ nước, tránh nhịn tiểu, giữ vệ sinh vùng kín.",
      "Nếu sốt cao, đau hông lưng mạnh hoặc tiểu ra máu, cần khám ngay.",
      "Tránh thức ăn nhiều muối, hạn chế đồ uống có cồn.",
    ],
    severity: {
      "sốt cao kèm đau lưng": "Cần khám cấp cứu - có thể viêm thận cấp.",
      "tiểu ra máu": "Cần khám chuyên khoa ngay.",
      "không tiểu được": "Cần đến bệnh viện ngay.",
    },
  },
  {
    name: "Cơ xương khớp",
    specialty: "Cơ xương khớp",
    keywords: ["đau lưng", "đau cơ", "đau khớp", "cứng khớp", "sưng khớp", "tê chân tay", "yếu cơ", "đau vai", "đau gối", "đau cổ", "thoái hóa", "viêm khớp", "đau thần kinh tọa", "chuột rút"],
    possibilities: ["căng cơ", "thoái hóa khớp", "viêm khớp", "chèn ép rễ thần kinh", "loại khớp", "gout"],
    actions: [
      "Nghỉ ngơi tương đối, tránh mang vác nặng, chườm nóng nhẹ.",
      "Nếu mất sức cơ, tê lan rộng hoặc sốt kèm đau khớp, cần khám chuyên khoa.",
      "Tập thể dục đều đặn, duy trì cân nặng hợp lý, bổ sung canxi.",
    ],
    severity: {
      "đau dữ dội không giảm": "Cần khám để loại trừ bệnh lý nặng.",
      "sưng đỏ nóng khớp": "Cần khám ngay - có thể viêm khớp nhiễm trùng.",
      "yếu cơ đột ngột": "Cần khám chuyên khoa.",
    },
  },
  {
    name: "Nội tiết",
    specialty: "Nội tiết",
    keywords: ["khát nước", "sụt cân", "mệt mỏi", "run tay", "hồi hộp", "tiểu đêm", "ăn nhiều", "mắt lồi", "cổ to", "tăng cân nhanh", "giảm cân nhanh", "rụng tóc", "tăng huyết áp", "hạ đường huyết"],
    possibilities: ["rối loạn đường huyết", "rối loạn tuyến giáp", "hội chứng chuyển hóa", "cường giáp", "suy giáp", "đái tháo đường"],
    actions: [
      "Theo dõi đường huyết tại nhà nếu có máy, điều chỉnh chế độ ăn.",
      "Đặt lịch khám nội tiết để làm xét nghiệm xác định.",
      "Ăn đều đặn, tránh đồ ngọt nhiều, tập thể dục đều.",
    ],
    severity: {
      "hạ đường huyết": "Cần bổ sung đường ngay - có thể nguy hiểm.",
      "mắt lồi": "Cần khám nội tiết sớm.",
      "sụt cân nhanh không rõ lý do": "Cần khám để tìm nguyên nhân.",
    },
  },
  {
    name: "Da liễu - Dị ứng",
    specialty: "Da liễu",
    keywords: ["ngứa", "nổi mẩn đỏ", "phát ban", "nổi mề đay", "bong tróc", "mụn mủ", "dị ứng", "sưng phù", "đỏ da", "da khô", "nấm da", "viêm da", "chàm", "vẩy nến"],
    possibilities: ["dị ứng da", "viêm da tiếp xúc", "viêm nang lông", "nấm da", "chàm", "vẩy nến", "mề đay"],
    actions: [
      "Tránh gãi, tránh chất kích thích mới, giữ da sạch và khô.",
      "Nếu sưng môi, khó thở, nổi ban lan nhanh hoặc sốt cao, cần cấp cứu.",
      "Sử dụng kem dưỡng ẩm, tránh xà phòng mạnh.",
    ],
    severity: {
      "sưng môi, khó thở": "Cần gọi 115 ngay - dị ứng nặng.",
      "phát ban toàn thân kèm sốt": "Cần khám ngay.",
      "tổn thương da lan rộng": "Cần khám da liễu.",
    },
  },
  {
    name: "Tai mũi họng",
    specialty: "Tai mũi họng",
    keywords: ["đau tai", "ù tai", "nghe kém", "ngạt mũi", "chảy mũi", "đau họng", "khàn tiếng", "đau xoang", "viêm amidan", "viêm tai giữa", "viêm xoang", "chảy máu mũi", "điếc đột ngột", "hoa mắt chóng mặt"],
    possibilities: ["viêm mũi xoang", "viêm họng", "viêm tai giữa", "viêm thanh quản", "dị ứng mũi", "polyp mũi", "viêm amidan"],
    actions: [
      "Rửa mũi bằng nước muối sinh lý, uống ấm, giữ ấm cổ họng.",
      "Nếu sốt cao, đau tai dữ dội hoặc khó nuốt tăng dần, cần khám sớm.",
      "Tránh hút thuốc, tránh môi trường ô nhiễm.",
    ],
    severity: {
      "đau tai dữ dội": "Cần khám ngay - có thể viêm tai cấp.",
      "chảy máu mũi không cầm được": "Cần đến cơ sở y tế.",
      "điếc đột ngột": "Cần khám cấp cứu.",
    },
  },
  {
    name: "Mắt",
    specialty: "Nhãn khoa",
    keywords: ["đỏ mắt", "mờ mắt", "nhức mắt", "chảy nước mắt", "nhìn đôi", "xót mắt", "ngứa mắt", "sưng mí mắt", "đau mắt", "nhìn mờ đột ngột", "nhìn thấy đốm đen", "ánh sáng nhạy cảm"],
    possibilities: ["viêm kết mạc", "khô mắt", "kích ứng mắt", "tăng nhãn áp cần loại trừ", "đục thủy tinh thể", "thoái hóa điểm vàng"],
    actions: [
      "Hạn chế dùng mắt, giữ vệ sinh mắt và ngủ đủ giấc.",
      "Nếu đau nhức mắt dữ dội, giảm thị lực nhanh hoặc chấn thương mắt, cần khám cấp cứu.",
      "Đeo kính bảo hộ khi ra nắng, tránh dùng máy tính quá lâu.",
    ],
    severity: {
      "đau mắt dữ dội kèm nhìn mờ": "Cần khám cấp cứu - có thể tăng nhãn áp.",
      "nhìn mờ đột ngột": "Cần khám ngay.",
      "chấn thương mắt": "Cần đến cơ sở y tế ngay.",
    },
  },
  {
    name: "Sản phụ khoa",
    specialty: "Sản phụ khoa",
    keywords: ["đau bụng dưới", "rối loạn kinh nguyệt", "ra huyết bất thường", "huyết trắng nhiều", "ngứa âm đạo", "đau kinh", "kinh nguyệt không đều", "ra huyết sau quan hệ", "đau khi quan hệ", "chậm kinh", "mong có thai", "hiếm muộn", "thai ngoài tử cung"],
    possibilities: ["rối loạn nội tiết phụ khoa", "viêm phụ khoa", "u nang buồng trứng cần theo dõi", "lạc nội mạc tử cung", "thai ngoài tử cung"],
    actions: [
      "Theo dõi chu kỳ và lượng huyết, giữ vệ sinh phụ khoa đúng cách.",
      "Nếu đau bụng dữ dội, sốt, ra máu nhiều hoặc nghi có thai, cần khám ngay.",
      "Khám phụ khoa định kỳ 6 tháng/lần.",
    ],
    severity: {
      "đau bụng dữ dội kèm ra máu": "Cần khám cấp cứu - có thể thai ngoài tử cung.",
      "ra máu nhiều khi mang thai": "Cần đến bệnh viện ngay.",
      "sốt cao kèm đau bụng": "Cần khám ngay.",
    },
  },
  {
    name: "Sức khỏe tâm thần",
    specialty: "Tâm lý - Tâm thần",
    keywords: ["lo âu", "căng thẳng", "mất ngủ", "buồn chán", "chán ăn", "mệt mỏi tinh thần", "hoảng sợ", "tim đập nhanh khi lo lắng", "sợ hãi", "mất hứng thú", "tự cô lập", "ý nghĩ tự hại", "đau đầu kinh niên", "mệt mỏi mãn tính"],
    possibilities: ["rối loạn lo âu", "trầm cảm mức độ nhẹ", "rối loạn giấc ngủ do stress", "rối loạn panic", "burnout", "mệt mỏi mãn tính"],
    actions: [
      "Duy trì lịch ngủ ổn định, tập thở sâu, giảm cà phê buổi tối.",
      "Nếu xuất hiện ý nghĩ tự hại hoặc mất ngủ kéo dài, cần liên hệ chuyên gia ngay.",
      "Tìm hoạt động giải trí, chia sẻ với người thân, tập thể dục đều đặn.",
    ],
    severity: {
      "ý nghĩ tự hại": "Cần gọi hỗ trợ tâm lý ngay - gọi 1900 9679.",
      "mất ngủ kéo dài trên 1 tháng": "Cần khám chuyên khoa.",
      "hoảng sổ tái đi tái lại": "Cần điều trị chuyên khoa.",
    },
  },
  // Nhi khoa - Pediatrics
  {
    name: "Nhi khoa",
    specialty: "Nhi khoa",
    keywords: ["sốt cao ở trẻ", "ho ở trẻ", "tiêu chảy ở trẻ", "nôn trớ ở trẻ", "phát ban ở trẻ", "sụp mi ở trẻ", "bú kém", "bụng distended trẻ", "co giật ở trẻ", "thở rên ở trẻ", "trẻ bỏ bú", "trẻ quấy khóc", "trẻ chậm phát triển", "trẻ lười ăn", "trẻ sốt cao co giật"],
    possibilities: ["nhiễm trùng hô hấp", "tiêu chảy cấp", "sốt cao co giật", "viêm tai giữa", "viêm phổi", "bệnh tay chân miệng", "sởi", "thủy đậu"],
    actions: [
      "Theo dõi sốt thường xuyên, cho trẻ uống nước, sữa thường xuyên.",
      "Nếu sốt cao trên 38.5°C kéo dài hoặc co giật, cần đưa trẻ đến cơ sở y tế ngay.",
      "Tránh tự ý cho trẻ uống thuốc, đặc biệt là aspirin.",
    ],
    severity: {
      "co giật sốt": "Cần đưa trẻ đến bệnh viện ngay.",
      "trẻ bỏ bú hoàn toàn": "Cần khám cấp cứu.",
      "sốt cao kèm phát ban": "Cần khám ngay.",
    },
  },
  // Ngoại tổng quát - General Surgery
  {
    name: "Ngoại tổng quát",
    specialty: "Ngoại tổng quát",
    keywords: ["đau bụng cấp", "nôn ói", "không đại tiện", "không trung tiện", "đau ruột thừa", "heria", "nổi u cục", "chảy máu ruột", "đau bụng dữ dội", "bụng căng cứng", "buồn nôn liên tục", "sỏi mật", "sỏi thận đau", "viêm ruột thừa"],
    possibilities: ["viêm ruột thừa cấp", "tắc ruột", "heria kẹt", "viêm túi mật cấp", "peritonitis", "sỏi tiết niệu", "chảy máu tiêu hóa"],
    actions: [
      "Không ăn uống gì khi nghi ngờ bệnh lý cấp cứu bụng.",
      "Nếu đau bụng dữ dội, nôn liên tục hoặc bụng cứng, cần đến bệnh viện ngay.",
      "Theo dõi nôn, phân, sốt và các dấu hiệu bất thường.",
    ],
    severity: {
      "đau bụng dữ dội không giảm": "Cần cấp cứu ngay.",
      "nôn ra máu": "Cần đến bệnh viện ngay.",
      "không đại tiện kèm nôn": "Cần khám cấp cứu.",
    },
  },
  // Ngoại chấn thương chỉnh hình - Orthopedic Trauma
  {
    name: "Ngoại chấn thương chỉnh hình",
    specialty: "Chấn thương chỉnh hình",
    keywords: ["gãy xương", "bong gân", "trật khớp", "chấn thương", "sưng đau chân", "sưng đau tay", "không cử động được", "bước không được", "đau sau chấn thương", "chảy máu không cầm được", "vết thương hở", "chảy máu vết thương", "xương bị lộ", "chân tay biến dạng", "bị đánh ngã"],
    possibilities: ["gãy xương hở", "gãy xương kín", "bong gân khớp", "trật khớp", "chấn thương phần mềm", "vết thương hở", "chảy máu nặng"],
    actions: [
      "Cố định tạm vùng bị thương, không di chuyển nếu nghi ngờ gãy xương.",
      "Nếu chảy máu nhiều, cần cầm máu bằng băng ép và đến cơ sở y tế ngay.",
      "Chườm đá nếu sưng nông, tránh chườm nóng trong 48 giờ đầu.",
    ],
    severity: {
      "chảy máu không cầm được": "Cần cấp cứu ngay - gọi 115.",
      "xương lộ ra ngoài": "Cần cấp cứu ngay.",
      "bất tỉnh sau chấn thương": "Cần gọi 115 ngay.",
    },
  },
  // Ngoại thần kinh - Neurosurgery
  {
    name: "Ngoại thần kinh",
    specialty: "Ngoại thần kinh",
    keywords: ["đau đầu dữ dội", "chảy máu não", "u não", "co giật", "bất tỉnh", "liệt", "yếu một bên", "nói ngọng", "mất ý thức", "đột quỵ", "xuất huyết não", "nhồi máu não", "chấn thương sọ não", "hôn mê", "đồng tử giãn"],
    possibilities: ["đột quỵ não", "xuất huyết não", "u não", "chấn thương sọ não nặng", "co giật không kiểm soát"],
    actions: [
      "Nếu nghi ngờ đột quỵ, gọi 115 ngay - thời gian vàng điều trị rất quan trọng.",
      "Không cho ăn uống gì khi bệnh nhân bất tỉnh.",
      "Đặt bệnh nhân ở tư thế an toàn, nghiêng đầu nếu nôn.",
    ],
    severity: {
      "đau đầu dữ dội đột ngột": "Cần cấp cứu ngay - có thể xuất huyết não.",
      "yếu tay chân một bên đột ngột": "Cần gọi 115 ngay - có thể đột quỵ.",
      "bất tỉnh": "Cần cấp cứu ngay.",
    },
  },
  // Ngoại lồng ngực - tim mạch - Thoracic Cardiovascular Surgery
  {
    name: "Ngoại lồng ngực tim mạch",
    specialty: "Ngoại lồng ngực tim mạch",
    keywords: ["đau ngực dữ dội", "khó thở nặng", "tức ngực", "chảy máu ngực", "ho ra máu", "nuốt khó", "khó nuốt", "đau giữa ngực", "đau lan ra sau lưng", "phổi xẹp", "tràn khí màng phổi", "tràn dịch màng phổi", "chấn thương ngực", "bệnh lý van tim"],
    possibilities: ["tràn khí màng phổi", "tràn dịch màng phổi", "chấn thương ngực", "bệnh lý mạch vành", "bệnh lý van tim", "u trung thất"],
    actions: [
      "Nếu đau ngực dữ dội hoặc khó thở nặng, gọi 115 ngay.",
      "Ngồi nửa người để giảm khó thở nếu có tràn dịch.",
      "Tránh hoạt động nặng, theo dõi nhịp thở và nhịp tim.",
    ],
    severity: {
      "đau ngực dữ dội kèm khó thở": "Cần cấp cứu ngay - có thể nhồi máu cơ tim.",
      "ho ra máu nhiều": "Cần đến bệnh viện ngay.",
      "khó thở dữ dội": "Cần gọi 115.",
    },
  },
  // Ngoại tiết niệu - Urology
  {
    name: "Ngoại tiết niệu",
    specialty: "Ngoại tiết niệu",
    keywords: ["đau thận cấp", "sỏi thận", "sỏi bàng quang", "tiểu máu", "tiểu buốt rát", "viêm tinh hoàn", "xoắn tinh hoàn", "phì đại tuyến tiền liệt", "đau vùng hạ vị", "đau tinh hoàn", "dương vật đau", "tiểu khó", "nước tiểu có máu", "sỏi tiết niệu", "nhiễm trùng tiết niệu nặng"],
    possibilities: ["sỏi thận", "sỏi bàng quang", "viêm tinh hoàn", "xoắn tinh hoàn", "nhiễm trùng tiết niệu nặng", "phì đại tiền liệt tành"],
    actions: [
      "Uống nhiều nước để thải sỏi, theo dõi nước tiểu.",
      "Nếu đau dữ dội vùng thắt lưng hoặc sốt cao, cần khám ngay.",
      "Tránh nhịn tiểu, giữ vệ sinh vùng kín.",
    ],
    severity: {
      "đau thắt lưng dữ dội kèm nôn": "Cần khám cấp cứu - có thể sỏi thận.",
      "xoắn tinh hoàn": "Cần cấp cứu trong 6 giờ.",
      "sốt cao kèm đau thắt lưng": "Cần khám ngay - có thể viêm thận cấp.",
    },
  },
  // Răng hàm mặt - Nha khoa - Dentistry
  {
    name: "Răng hàm mặt",
    specialty: "Răng hàm mặt",
    keywords: ["đau răng", "sâu răng", "viêm nướu", "chảy máu chân răng", "răng lung lay", "hôi miệng", "áp xe răng", "mặt sưng", "đau hàm", "khó há miệng", "viêm khớp thái dương hàm", "răng khôn", "răng số 8", "nướu sưng đỏ", "răng đổi màu"],
    possibilities: ["sâu răng", "viêm nướu", "viêm tủy răng", "áp xe răng", "viêm quanh răng khôn", "viêm khớp thái dương hàm"],
    actions: [
      "Súc miệng nước muối ấm, chải răng đều đặn.",
      "Nếu sưng mặt lan rộng hoặc sốt cao, cần khám ngay.",
      "Hạn chế đồ ngọt, khám răng định kỳ mỗi 6 tháng.",
    ],
    severity: {
      "sưng mặt lan nhanh": "Cần khám ngay - có thể nhiễm trùng lan rộng.",
      "sốt cao kèm đau răng": "Cần khám nha khoa ngay.",
      "không há miệng được": "Cần khám cấp cứu.",
    },
  },
  // Ung bướu - Oncology
  {
    name: "Ung bướu",
    specialty: "Ung bướu",
    keywords: ["u", "khối u", "ung thư", "gầy", "sụt cân không rõ lý do", "nổi hạch", "ho ra máu", "đại tiện ra máu", "tiểu ra máu", "nuốt khó", "khó nuốt", "thay đổi thói quen đại tiện", "vết loại không lành", "nốt ruồi thay đổi", "chảy dịch bất thường", "đau không rõ nguyên nhân", "mệt mỏi kéo dài"],
    possibilities: ["ung thư phổi", "ung thư đại tràng", "ung thư dạ dày", "ung thư vú", "ung thư cổ tử cung", "ung thư máu", "u lành", "hạch bạch huyết"],
    actions: [
      "Đặt lịch khám chuyên khoa ung bướu để chẩn đoán xác định.",
      "Theo dõi cân nặng, các triệu chứng bất thường và ghi chép lại.",
      "Khám định kỳ nếu có tiền sử gia đình ung thư.",
    ],
    severity: {
      "ho ra máu kéo dài": "Cần khám ngay.",
      "sụt cân nhanh không rõ nguyên nhân": "Cần khám sớm.",
      "nổi hạch cứng không đau": "Cần khám chuyên khoa.",
    },
  },
  // Phục hồi chức năng - Rehabilitation Medicine
  {
    name: "Phục hồi chức năng",
    specialty: "Phục hồi chức năng",
    keywords: ["liệt", "cứng cơ", "co rút cơ", "yếu cơ", "không đi được", "không cầm được", "phục hồi sau tai biến", "phục hồi sau chấn thương", "tập vật lý trị liệu", "xoa bóp", "tê liệt", "mất cảm giác", "đau thần kinh", "đau sau phẫu thuật", "phục hồi vận động", "tập walking"],
    possibilities: ["liệt sau tai biến", "co rút cơ sau chấn thương", "yếu cơ do bệnh lý thần kinh", "hậu phẫu", "chấn thương спиналь", "đau thần kinh mãn tính"],
    actions: [
      "Tập vật lý trị liệu đều đặn theo hướng dẫn của chuyên viên.",
      "Duy trì tư thế đúng, tập cử động chủ động hàng ngày.",
      "Theo dõi tiến trình phục hồi và báo cáo với bác sĩ.",
    ],
    severity: {
      "đau dữ dội không giảm": "Cần tái khám.",
      "co rút cơ nặng dần": "Cần điều trị tích cực.",
      "mất cảm giác lan rộng": "Cần khám ngay.",
    },
  },
  // Y học cổ truyền - Traditional Chinese Medicine
  {
    name: "Y học cổ truyền",
    specialty: "Y học cổ truyền",
    keywords: ["đau nhức xương khớp", "mệt mỏi", "nóng trong", "lạnh chân tay", "đau bụng lạnh", "tiêu chảy lạnh", "ho khan", "đờm nhiều", "mất ngủ", "stress", "đau đầu kinh niên", "viêm xoang mãn tính", "dị ứng mãn tính", "tê tay chân", "đau thắt lưng mãn tính", "suy nhược cơ thể", "cần bổ thận tráng dương", "can huyết kém", "tỳ vị kém", "phong thấp"],
    possibilities: ["hội chứng thận hư", "hội chứng tỳ khí kém", "huyết hư", "phong thấp", "đau nhức xương khớp do lạnh", "suy nhược thần kinh", "rối loạn tiêu hóa chức năng"],
    actions: [
      "Chế độ ăn uống phù hợp theo cơ thể (lạnh/nóng), tránh đồ lạnh.",
      "Tập thể dục nhẹ như đi bộ, yoga,气功 để cân bằng cơ thể.",
      "Khám bác sĩ y học cổ truyền để được tư vấn thể trạng và thuốc.",
    ],
    severity: {
      "đau dữ dội không giảm": "Cần tái khám.",
      "triệu chứng tăng nhanh": "Cần khám chuyên khoa.",
    },
  },
];

const normalize = (value) =>
  (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const containsAny = (text, arr) => arr.some((keyword) => text.includes(keyword));
const detectEmergency = (text) => emergencyRules.filter((rule) => containsAny(text, rule.keywords));

const detectProfiles = (text) =>
  symptomProfiles
    .map((profile) => ({
      profile,
      score: profile.keywords.filter((keyword) => text.includes(keyword)).length,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

const parseDuration = (text) => {
  const hourMatch = text.match(/(\d+)\s*(giờ|tiếng)/i);
  if (hourMatch) return `${hourMatch[1]} giờ`;
  const dayMatch = text.match(/(\d+)\s*ngày/i);
  if (dayMatch) return `${dayMatch[1]} ngày`;
  const weekMatch = text.match(/(\d+)\s*tuần/i);
  if (weekMatch) return `${weekMatch[1]} tuần`;
  const monthMatch = text.match(/(\d+)\s*tháng/i);
  if (monthMatch) return `${monthMatch[1]} tháng`;
  return "chưa rõ";
};

const buildClarifyQuestions = (topProfile) => {
  const byProfile = {
    "Hô hấp": [
      "Bạn có sốt bao nhiêu độ và kéo dài bao lâu?",
      "Ho có đờm máu không, có khó thở khi nằm không?",
    ],
    "Tiêu hóa": [
      "Đau bụng ở vị trí nào và xuất hiện sau ăn không?",
      "Bạn có nôn, tiêu chảy, sốt hoặc mất nước không?",
    ],
    "Tim mạch": [
      "Đau ngực xuất hiện lúc nghỉ hay lúc gắng sức?",
      "Bạn đã đo huyết áp, nhịp tim gần đây chưa?",
    ],
    "Thần kinh": [
      "Đau đầu có kèm nôn, sợ ánh sáng hoặc tê yếu tay chân không?",
      "Triệu chứng xuất hiện đột ngột hay tăng dần?",
    ],
    "Tiết niệu": [
      "Bạn có sốt, đau hông lưng hoặc tiểu ra máu không?",
      "Tần suất tiểu buốt/tiểu rắt xuất hiện từ khi nào?",
    ],
    "Cơ xương khớp": [
      "Đau có giảm khi nghỉ ngơi không?",
      "Bạn có sưng đỏ khớp hoặc sốt kèm đau khớp không?",
    ],
    "Nội tiết": [
      "Bạn có khát nước nhiều, ăn nhiều mà vẫn gầy không?",
      "Bạn đã xét nghiệm đường huyết chưa?",
    ],
    "Da liễu - Dị ứng": [
      "Bạn có dị ứng thuốc hoặc thức ăn gì không?",
      "Tổn thương có lan rộng hoặc kèm sốt không?",
    ],
    "Tai mũi họng": [
      "Bạn có đau tai, ù tai hoặc nghe kém không?",
      "Bạn có sốt cao hoặc nuốt đau không?",
    ],
    "Mắt": [
      "Bạn có đỏ mắt, chảy nước mắt hoặc nhìn mờ không?",
      "Triệu chứng xuất hiện đột ngột hay từ từ?",
    ],
    "Sản phụ khoa": [
      "Chu kỳ kinh nguyệt của bạn có đều không?",
      "Bạn có ra huyết bất thường hoặc đau bụng dưới không?",
    ],
    "Sức khỏe tâm thần": [
      "Bạn có mất ngủ hoặc lo lắng thường xuyên không?",
      "Bạn có cảm thấy buồn chán kéo dài trên 2 tuần không?",
    ],
  };

  return byProfile[topProfile?.name] || [
    "Triệu chứng bắt đầu từ khi nào và mức độ nặng hay nhẹ?",
    "Có dấu hiệu nào làm triệu chứng nặng hơn không?",
  ];
};

const getSeverityAdvice = (profile, text) => {
  if (!profile.severity) return null;
  
  for (const [key, advice] of Object.entries(profile.severity)) {
    if (text.includes(key)) {
      return advice;
    }
  }
  return null;
};

const ensurePunctuation = (text) => {
  const value = String(text || "").trim();
  if (!value) return value;
  if (/[.!?]$/.test(value)) return value;
  return `${value}.`;
};

const toFriendlyChat = (text) => {
  let value = String(text || "")
    .replace(/\*\*/g, "")
    .replace(/^[\-\*\d\.\)\s]+/gm, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!value) return value;
  if (!/^(mình|bạn|chào|xin chào)/i.test(value)) {
    value = `Mình đọc triệu chứng của bạn rồi. ${value}`;
  }
  return ensurePunctuation(value);
};

const toProfessionalText = (text) => {
  let value = String(text || "")
    .replace(/\*\*/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!value) return value;
  value = value.replace(/\bminh\b/gi, "Tôi");
  return ensurePunctuation(value);
};

const normalizeMood = (mood) =>
  mood === AI_MOODS.PROFESSIONAL ? AI_MOODS.PROFESSIONAL : AI_MOODS.CHAT;

// Medication database by symptom profile
const medicationRecommendations = {
  "Hô hấp": [
    { medicine: "Paracetamol 500mg", dosage: "1 viên/lần khi sốt >38.5°C", usage: "Cách 4-6 tiếng, tối đa 4 viên/ngày" },
    { medicine: "Ambroxol 30mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Sau ăn, giúp long đờm" },
    { medicine: "Oroxine 5mg", dosage: "1 viên/lần, ngày 2-3 lần", usage: "Trị ho" },
  ],
  "Tiêu hóa": [
    { medicine: "Almagel", dosage: "1 gói/lần, ngày 3 lần", usage: "Trước ăn 30 phút, trị đau dạ dày" },
    { medicine: "Smecta", dosage: "1 gói/lần, ngày 3 lần", usage: "Trị tiêu chảy" },
    { medicine: "Domperidon 10mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Trước ăn, trị nôn buồn nôn" },
  ],
  "Tim mạch": [
    { medicine: "Aspirin 81mg", dosage: "1 viên/ngày", usage: "Sau ăn, phòng ngừa tim mạch" },
    { medicine: "Captopril 25mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Trị tăng huyết áp (theo chỉ định bác sĩ)" },
  ],
  "Thần kinh": [
    { medicine: "Paracetamol 500mg", dosage: "1 viên/lần khi đau đầu", usage: "Cách 4-6 tiếng, tối đa 4 viên/ngày" },
    { medicine: "Cinnarizin 25mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Trị chóng mặt, rối loạn tiền đình" },
    { medicine: "Diazepam 5mg", dosage: "1 viên/ngày", usage: "Trị mất ngủ (theo chỉ định)" },
  ],
  "Tiết niệu": [
    { medicine: "Ciprofloxacin 500mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Trị viêm đường tiết niệu (theo đơn)" },
    { medicine: "Norfloxacin 400mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Trị viêm bàng quang" },
  ],
  "Cơ xương khớp": [
    { medicine: "Diclofenac 50mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Sau ăn, trị đau khớp" },
    { medicine: "Meloxicam 7.5mg", dosage: "1 viên/ngày", usage: "Trị viêm khớp (theo chỉ định)" },
  ],
  "Nội tiết": [
    { medicine: "Metformin 500mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Trị đái tháo đường type 2 (theo đơn)" },
  ],
  "Da liễu - Dị ứng": [
    { medicine: "Cetirizine 10mg", dosage: "1 viên/ngày", usage: "Trị dị ứng, ngứa" },
    { medicine: "Hydrocortison 1%", dosage: "Bôi 2-3 lần/ngày", usage: "Trị viêm da, ngứa" },
  ],
  "Tai mũi họng": [
    { medicine: "Chlorpheniramin 4mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Trị viêm mũi dị ứng" },
    { medicine: "Sodium chloride 0.9%", dosage: "Nhỏ mũi 3-4 lần/ngày", usage: "Rửa mũi, giữ ẩm" },
  ],
  "Mắt": [
    { medicine: "Tobramycin 0.3%", dosage: "Nhỏ mắt 1-2 giọt/lần, ngày 3-4 lần", usage: "Trị viêm kết mạc (theo đơn)" },
    { medicine: "Refresh Plus", dosage: "Nhỏ mắt khi khô", usage: "Trị khô mắt" },
  ],
  "Sản phụ khoa": [
    { medicine: "Mebendazol 500mg", dosage: "Uống 1 viên duy nhất", usage: "Trị nấm âm đạo (theo đơn)" },
  ],
  "Sức khỏe tâm thần": [
    { medicine: "Diphenhydramin 25mg", dosage: "1 viên/ngày", usage: "Trị mất ngủ nhẹ (theo chỉ định)" },
  ],
  // Nhi khoa - Pediatrics
  "Nhi khoa": [
    { medicine: "Paracetamol 150mg (dạng súp)", dosage: "1 thìa/lần khi sốt >38°C", usage: "Cách 4-6 tiếng, tối đa 4 liều/ngày" },
    { medicine: "Ibuprofen 100mg/5ml", dosage: "1 thìa/lần, ngày 3 lần", usage: "Trị sốt, đau (sau ăn)" },
    { medicine: "ORS (Oresol)", dosage: "1 gói pha 200ml", usage: "Bù nước khi tiêu chảy, uống từ từ" },
    { medicine: "Smecta", dosage: "1 gói/lần, ngày 2-3 lần", usage: "Trị tiêu chảy ở trẻ" },
    { medicine: "Vitamin C 100mg", dosage: "1 viên/ngày", usage: "Bổ sung vitamin, tăng đề kháng" },
  ],
  // Ngoại tổng quát - General Surgery
  "Ngoại tổng quát": [
    { medicine: "Paracetamol 500mg", dosage: "1 viên/lần khi đau", usage: "Cách 4-6 tiếng, tối đa 4 viên/ngày" },
    { medicine: "Tramadol 50mg", dosage: "1 viên/lần khi đau nặng", usage: "Trị đau cấp (theo chỉ định bác sĩ)" },
    { medicine: "Almagel", dosage: "1 gói/lần, ngày 3 lần", usage: "Trước ăn 30 phút, trị đau dạ dày" },
    { medicine: "Domperidon 10mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Trước ăn, trị nôn buồn nôn" },
  ],
  // Ngoại chấn thương chỉnh hình - Orthopedic Trauma
  "Ngoại chấn thương chỉnh hình": [
    { medicine: "Diclofenac 50mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Sau ăn, trị đau khớp, viêm" },
    { medicine: "Celtiz 50mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Trị đau xương khớp, chấn thương" },
    { medicine: "Vitamin B1+B6+B12", dosage: "1 viên/ngày", usage: "Hỗ trợ thần kinh, giảm đau" },
    { medicine: "Calcium D3", dosage: "1 viên/ngày", usage: "Bổ sung canxi, hỗ trợ xương" },
    { medicine: "Gel chườm lạnh", dosage: "Bôi 3-4 lần/ngày", usage: "Giảm sưng đau sau chấn thương" },
  ],
  // Ngoại thần kinh - Neurosurgery
  "Ngoại thần kinh": [
    { medicine: "Diclofenac 50mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Trị đau đầu, đau thần kinh (sau ăn)" },
    { medicine: "Carbamazepin 200mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Trị đau thần kinh (theo đơn chuyên khoa)" },
    { medicine: "Gabapentin 300mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Trị đau thần kinh (theo chỉ định)" },
    { medicine: "Mannitol 20%", dosage: "Tiêm truyền theo chỉ định", usage: "Giảm phù não (cấp cứu)" },
  ],
  // Ngoại lồng ngực tim mạch - Thoracic Cardiovascular Surgery
  "Ngoại lồng ngực tim mạch": [
    { medicine: "Aspirin 81mg", dosage: "1 viên/ngày", usage: "Chống đau thắt ngực, phòng ngừa" },
    { medicine: "Isosorbide dinitrat 10mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Giãn mạch vành (theo chỉ định)" },
    { medicine: "Atorvastatin 20mg", dosage: "1 viên/ngày uống buổi tối", usage: "Hạ mỡ máu, phòng ngừa xơ vữa" },
    { medicine: "Furosemid 40mg", dosage: "1 viên/lần, ngày 1-2 lần", usage: "Trị phù, giảm gánh tim (theo đơn)" },
  ],
  // Ngoại tiết niệu - Urology
  "Ngoại tiết niệu": [
    { medicine: "Ciprofloxacin 500mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Trị nhiễm trùng tiết niệu (theo đơn)" },
    { medicine: "Norfloxacin 400mg", dosage: "1 viên/lần, ngày 2 lần", usage: "Trị viêm bàng quang, tiết niệu" },
    { medicine: "Tamsulosin 0.4mg", dosage: "1 viên/ngày", usage: "Trị phì đại tiền liệt tành (theo đơn)" },
    { medicine: "Spasmex 10mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Trị co thắt bàng quang, tiểu gấp" },
    { medicine: "Alpha D3", dosage: "1 viên/ngày", usage: "Hỗ trợ chức năng thận" },
  ],
  // Răng hàm mặt - Dentistry
  "Răng hàm mặt": [
    { medicine: "Paracetamol 500mg", dosage: "1 viên/lần khi đau", usage: "Trị đau răng, hạ sốt" },
    { medicine: "Ibuprofen 400mg", dosage: "1 viên/lần, ngày 2-3 lần", usage: "Trị đau răng, viêm (sau ăn)" },
    { medicine: "Metronidazol 250mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Trị viêm nướu, nhiễm trùng (theo đơn)" },
    { medicine: "Dexamethasone", dosage: "Nhỏ 3-4 lần/ngày", usage: "Trị sưng nướu, viêm (theo chỉ định)" },
    { medicine: "Chlorhexidine 0.12%", dosage: "Súc miệng 2 lần/ngày", usage: "Sát khuẩn, trị viêm nướu" },
  ],
  // Ung bướu - Oncology
  "Ung bướu": [
    { medicine: "Paracetamol 500mg", dosage: "1 viên/lần khi đau hoặc sốt", usage: "Trị đau, hạ sốt (theo hướng dẫn)" },
    { medicine: "Ondansetron 4mg", dosage: "1 viên/lần, ngày 2-3 lần", usage: "Trị nôn do hóa trị, xạ trị" },
    { medicine: "Megestrol 160mg", dosage: "1 viên/ngày", usage: "Kích thích ăn uống, chống suy kiệt" },
    { medicine: "Filgrastim", dosage: "Tiêm dưới da theo chỉ định", usage: "Tăng bạch cầu sau hóa trị" },
    { medicine: "Erythropoietin", dosage: "Tiêm theo chỉ định", usage: "Trị thiếu máu ung thư" },
  ],
  // Phục hồi chức năng - Rehabilitation Medicine
  "Phục hồi chức năng": [
    { medicine: "Diclofenac gel", dosage: "Bôi 3-4 lần/ngày", usage: "Giảm đau cơ xương khớp" },
    { medicine: "Baclofen 10mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Trị co cứng cơ (theo đơn)" },
    { medicine: "Gabapentin 300mg", dosage: "1 viên/lần, ngày 3 lần", usage: "Trị đau thần kinh sau chấn thương" },
    { medicine: "Vitamin B1+B6+B12", dosage: "1 viên/ngày", usage: "Hỗ trợ thần kinh, phục hồi" },
    { medicine: "Calcium D3", dosage: "1 viên/ngày", usage: "Bổ sung canxi, xương" },
    { medicine: "Mecobalamin 500mcg", dosage: "1 viên/ngày", usage: "Hỗ trợ thần kinh ngoại biên" },
  ],
  // Y học cổ truyền - Traditional Chinese Medicine
  "Y học cổ truyền": [
    { medicine: "Bổ thận tráng dương (thảo dược)", dosage: "1-2 gói/lần, ngày 2 lần", usage: "Trị thận hư, mệt mỏi (theo tư vấn đông y)" },
    { medicine: "Hoạt huyết dưỡng não (thảo dược)", dosage: "1 viên/lần, ngày 2 lần", usage: "Cải thiện tuần hoàn não" },
    { medicine: "Cấp cứu ngũ quan thang", dosage: "1 gói/lần, ngày 2 lần", usage: "Trị cảm lạnh, đau đầu" },
    { medicine: "Sinh tân diệp (thảo dược)", dosage: "1-2 gói/ngày", usage: "Bổ sung năng lượng, giảm mệt" },
    { medicine: "Đại bạch phục linh", dosage: "1-2 gói/lần, ngày 2 lần", usage: "Trị tỳ khí kém, tiêu chảy" },
    { medicine: "Thiên ma địa long hoàn", dosage: "1 viên/lần, ngày 2 lần", usage: "Trị phong thấp, đau nhức xương khớp" },
    { medicine: "Tứ trụ thang", dosage: "1-2 gói/lần, ngày 2 lần", usage: "Trị đau thắt lưng, thận kém" },
  ],
};

// ===========================================
// DATABASE THUỐC THEO TỪNG BỆNH CỤ THỂ
// ===========================================

const diseaseMedications = {
  // BỆNH HÔ HẤP
  "Cảm cúm": {
    medicines: [
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi sốt >38.5°C", frequency: "Cách 4-6 tiếng, tối đa 4 viên/ngày", note: "Hạ sốt, giảm đau" },
      { name: "Oseltamivir 75mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 5 ngày (nếu có chỉ định)", note: "Trị cúm A/B (theo đơn)" },
      { name: "Vitamin C 100mg", dose: "1-2 viên/ngày", frequency: "Uống sau ăn", note: "Tăng sức đề kháng" },
      { name: "Chlorpheniramin 4mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Khi chảy mũi, hắt hơi", note: "Giảm triệu chứng cảm" },
    ],
    advice: "Nghỉ ngơi, uống đủ nước ấm, giữ ấm cơ thể. Nếu sốt trên 39°C kéo dài trên 3 ngày cần khám bác sĩ.",
  },
  "Viêm họng": {
    medicines: [
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi đau", frequency: "Cách 4-6 tiếng", note: "Giảm đau họng, hạ sốt" },
      { name: "Amoxicillin 500mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trong 7-10 ngày (theo đơn)", note: "Kháng sinh trị viêm họng do vi khuẩn" },
      { name: "Dexamethasone 0.5mg", dose: "1 viên/lần, ngày 2-3 lần", frequency: "Trong 3 ngày (theo đơn)", note: "Giảm sưng đau họng" },
      { name: "Thuốc súc họng", dose: "Súc miệng 3-4 lần/ngày", frequency: "Sau ăn, không nuốt", note: "Sát khuẩn, giảm đau" },
    ],
    advice: "Súc miệng nước muối ấm, uống nước ấm, tránh đồ lạnh. Nếu đau họng kèm sốt cao trên 3 ngày cần khám.",
  },
  "Viêm phế quản": {
    medicines: [
      { name: "Ambroxol 30mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Sau ăn", note: "Long đờm" },
      { name: "Amoxicillin 500mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trong 7 ngày (theo đơn)", note: "Kháng sinh" },
      { name: "Salbutamol 4mg", dose: "1 viên/lần khi khó thở", frequency: "Tối đa 3 lần/ngày", note: "Giãn phế quản (theo chỉ định)" },
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi sốt", frequency: "Cách 4-6 tiếng", note: "Hạ sốt" },
    ],
    advice: "Uống đủ nước, giữ ấm, tránh khói bụi. Ho có đờm là cơ chế tự làm sạch, không nên dùng thuốc ho khi chưa có chỉ định.",
  },
  "Viêm phổi": {
    medicines: [
      { name: "Amoxicillin 500mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trong 7-14 ngày (theo đơn)", note: "Kháng sinh - điều trị chính" },
      { name: "Azithromycin 500mg", dose: "1 viên/ngày", frequency: "Trong 5 ngày (theo đơn)", note: "Kháng sinh thay thế" },
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi sốt >38.5°C", frequency: "Cách 4-6 tiếng", note: "Hạ sốt" },
      { name: "Oxygen", dose: "Theo chỉ định", frequency: "Liên tục nếu SpO2 <94%", note: "Hỗ trợ thở (cơ sở y tế)" },
    ],
    advice: "Cần khám bác sĩ ngay. Viêm phổi cần điều trị kháng sinh. Nếu khó thở, sốt cao liên tục cần nhập viện.",
  },
  "Hen phế quản": {
    medicines: [
      { name: "Salbutamol HFA", dose: "2 nhịp/lần khi lên cơn", frequency: "Có thể lặp lại sau 4 giờ", note: "Thuốc cắt cơn (giãn phế quản)" },
      { name: "Budesonide/formoterol", dose: "2 nhịp/lần, ngày 2 lần", frequency: "Đều đặn", note: "Thuốc kiểm soát dự phòng" },
      { name: "Montelukast 10mg", dose: "1 viên/ngày", frequency: "Uống buổi tối", note: "Thuốc đường uống kiểm soát hen" },
      { name: "Prednisolon 5mg", dose: "1-2 viên/lần, ngày 2 lần", frequency: "Trong 5-7 ngày (theo đơn)", note: "Thuốc cắt cơn nặng" },
    ],
    advice: "Tránh tác nhân gây hen (bụi, phấn hoa, lông thú, khói thuốc). Sử dụng thuốc dự phòng đều đặn. Cần khám định kỳ.",
  },
  "Viêm mũi dị ứng": {
    medicines: [
      { name: "Cetirizine 10mg", dose: "1 viên/ngày", frequency: "Uống buổi sáng hoặc tối", note: "Kháng histamin thế hệ mới, ít buồn ngủ" },
      { name: "Loratadine 10mg", dose: "1 viên/ngày", frequency: "Uống buổi sáng", note: "Kháng histamin, ít gây buồn ngủ" },
      { name: "Fluticasone furoate", dose: "2 nhịp/mũi/ngày", frequency: "Sáng và tối", note: "Thuốc xịt mũi corticoid" },
      { name: "Chlorpheniramin 4mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Khi triệu chứng nặng", note: "Kháng histamin (có thể gây buồn ngủ)" },
    ],
    advice: "Tránh tiếp xúc với tác nhân gây dị ứng. Rửa mũi bằng nước muối sinh lý. Giữ nhà sạch sẽ, hạn chế thảm, rèm.",
  },
  "Viêm xoang": {
    medicines: [
      { name: "Amoxicillin 500mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trong 10-14 ngày (theo đơn)", note: "Kháng sinh điều trị viêm xoang" },
      { name: "Augmentin 625mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 10 ngày (theo đơn)", note: "Kháng sinh mạnh hơn" },
      { name: "Cetirizine 10mg", dose: "1 viên/ngày", frequency: "Uống buổi sáng", note: "Giảm chảy mũi, ngứa" },
      { name: "Xịt mũi NaCl 0.9%", dose: "Xịt 3-4 lần/ngày", frequency: "Rửa mũi", note: "Làm sạch xoang" },
      { name: "Methylprednisolone 4mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 5 ngày (theo đơn)", note: "Giảm viêm xoang nặng" },
    ],
    advice: "Xịt rửa mũi bằng nước muối thường xuyên. Uống đủ nước. Nếu đau xoang kèm sốt cao trên 3 ngày cần khám lại.",
  },

  // BỆNH TIÊU HÓA
  "Viêm dạ dày": {
    medicines: [
      { name: "Almagel (Aluminum hydroxide)", dose: "1 gói/lần, ngày 3 lần", frequency: "Trước ăn 30 phút", note: "Trung hòa acid, bảo vệ niêm mạc" },
      { name: "Omeprazole 20mg", dose: "1 viên/lần, ngày 1-2 lần", frequency: "Trước ăn sáng 30 phút", note: "Ức chế bơm proton - giảm acid" },
      { name: "Ranitidine 150mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Sáng và tối", note: "Kháng H2 - giảm tiết acid" },
      { name: "Sucralfate 1g", dose: "1 viên/lần, ngày 3 lần", frequency: "Trước ăn và trước ngủ", note: "Bảo vệ niêm mạc dạ dày" },
    ],
    advice: "Ăn uống điều độ, chia nhỏ bữa ăn. Tránh đồ cay nóng, rượu bia, caffeine. Không ăn quá no, không nằm ngay sau ăn.",
  },
  "Trào ngược dạ dày-thực quản (GERD)": {
    medicines: [
      { name: "Omeprazole 20mg", dose: "1 viên/lần, ngày 1 lần", frequency: "Trước ăn sáng 30 phút", note: "Ức chế bơm proton" },
      { name: "Esomeprazole 20mg", dose: "1 viên/lần, ngày 1 lần", frequency: "Trước ăn sáng", note: "Ức chế bơm proton thế hệ mới" },
      { name: "Almagel", dose: "1 gói/lần, ngày 3 lần", frequency: "Sau ăn 1 giờ và trước ngủ", note: "Trung hòa acid" },
      { name: "Domperidon 10mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trước ăn 15-30 phút", note: "Tăng nhu động dạ dày" },
    ],
    advice: "Không ăn quá no, tránh đồ ăn gây trào ngược (đồ chiên rán, chocolate, caffeine, rượu). Nâng đầu giường 10-15cm. Không nằm ngay sau ăn.",
  },
  "Tiêu chảy cấp": {
    medicines: [
      { name: "Smecta (Diosmectite)", dose: "1 gói/lần, ngày 3 lần", frequency: "Pha với nước, uống giữa các bữa", note: "Hấp thụ vi khuẩn, bảo vệ niêm mạc" },
      { name: "ORS (Oresol)", dose: "1 gói pha 200ml nước", frequency: "Uống liên tục thay nước", note: "Bù nước và điện giải" },
      { name: "Loperamide 2mg", dose: "2 viên/lần sau tiêu chảy", frequency: "Tối đa 8 viên/ngày", note: "Chống tiêu chảy (không dùng khi có sốt)" },
      { name: "Rifamixin 200mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trong 3 ngày (theo đơn)", note: "Kháng sinh đường ruột" },
    ],
    advice: "Uống đủ nước ORS, ăn cháo loãng, tránu sữa và đồ ăn béo. Nếu tiêu chảy trên 3 ngày, có máu trong phân hoặc sốt cao cần khám ngay.",
  },
  "Táo bón": {
    medicines: [
      { name: "Lactulose 15ml", dose: "1-2 thìa/ngày", frequency: "Sáng hoặc tối", note: "Nhuận tràng thẩm thấu" },
      { name: "Duphalac", dose: "15-30ml/ngày", frequency: "Sáng sau ăn", note: "Nhuận tràng" },
      { name: "Bisacodyl 5mg", dose: "1 viên/lần vào buổi tối", frequency: "Trước ngủ, hiệu quả sau 6-12 giờ", note: "Kích thích nhu động ruột" },
      { name: "Sennosid A+B", dose: "1-2 viên/lần, ngày 1-2 lần", frequency: "Sau ăn tối", note: "Nhuận tràng kích thích" },
    ],
    advice: "Uống đủ 2-3 lít nước/ngày. Ăn nhiều rau xanh, chất xơ. Tập thể dục đều đặn. Không nên lạm dụng thuốc nhuận tràng.",
  },
  "Hội chứng ruột kích thích (IBS)": {
    medicines: [
      { name: "Mebeverin 135mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trước ăn 20 phút", note: "Giảm co thắt ruột" },
      { name: "Dicycloverine 10mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trước ăn", note: "Giảm đau bụng, co thắt" },
      { name: "Loperamide 2mg", dose: "2 viên/lần khi tiêu chảy", frequency: "Tối đa 8 viên/ngày", note: "Kiểm soát tiêu chảy" },
      { name: "Almagel", dose: "1 gói/lần, ngày 3 lần", frequency: "Khi đầy hơi, khó chịu", note: "Giảm đầy hơi" },
    ],
    advice: "Tránh thức ăn gây kích thích ruột (đồ cay, đồ nhiều gas, caffeine). Giảm stress. Ăn chậm, nhai kỹ.",
  },
  "Viêm ruột thừa": {
    medicines: [
      { name: "Ceftriaxone 1g", dose: "1g tiêm tĩnh mạch, ngày 2 lần", frequency: "Theo đơn (cơ sở y tế)", note: "Kháng sinh trước phẫu thuật" },
      { name: "Metronidazole 500mg", dose: "1 lọ truyền, ngày 3 lần", frequency: "Theo đơn (cơ sở y tế)", note: "Kháng sinh kỵ khí" },
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi đau", frequency: "Cách 4-6 tiếng", note: "Giảm đau (không dùng Aspirin)" },
    ],
    advice: "Cần phẫu thuật cắt ruột thừa. Không ăn uống gì khi nghi ngờ viêm ruột thừa. Đến bệnh viện ngay nếu đau bụng dữ dội.",
  },

  // BỆNH TIM MẠCH
  "Tăng huyết áp": {
    medicines: [
      { name: "Amlodipine 5mg", dose: "1 viên/lần, ngày 1 lần", frequency: "Sáng sau ăn", note: "Ức chế kênh canxi - hạ áp" },
      { name: "Lisinopril 10mg", dose: "1 viên/lần, ngày 1 lần", frequency: "Sáng sau ăn", note: "Ức chế men chuyển - hạ áp" },
      { name: "Captopril 25mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trước ăn 1 giờ", note: "Hạ áp nhanh (theo chỉ định)" },
      { name: "Hydrochlorothiazide 25mg", dose: "1 viên/lần, ngày 1 lần", frequency: "Sáng sau ăn", note: "Lợi tiểu - hạ áp" },
      { name: "Telmisartan 40mg", dose: "1 viên/lần, ngày 1 lần", frequency: "Sáng hoặc tối", note: "Ức chế thụ thể angiotensin" },
    ],
    advice: "Hạn chế muối (dưới 5g/ngày). Giảm cân nếu thừa cân. Tập thể dục đều đặn (30 phút/ngày). Không hút thuốc, hạn chế rượu. Đo huyết áp thường xuyên.",
  },
  "Đau thắt ngực": {
    medicines: [
      { name: "Aspirin 81mg", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Chống đông máu, phòng ngừa" },
      { name: "Nitroglycerin 0.5mg", dose: "1 viên dưới lưỡi khi đau", frequency: "Có thể lặp lại sau 5 phút", note: "Giãn mạch vành giảm đau (cấp cứu)" },
      { name: "Isosorbide dinitrat 10mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Sáng, trưa, tối", note: "Giãn mạch vành dự phòng" },
      { name: "Atorvastatin 20mg", dose: "1 viên/ngày", frequency: "Uống buổi tối", note: "Hạ mỡ máu, ổn định mảng xơ vữa" },
      { name: "Metoprolol 50mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Sáng và tối", note: "Giảm nhịp tim, giảm gánh tim" },
    ],
    advice: "Tránh gắng sức, stress, lạnh đột ngột. Sử dụng thuốc giãn mạch theo chỉ định. Nếu đau ngực dữ dội không giảm sau 3 viên Nitroglycerin gọi 115 ngay.",
  },
  "Rối loạn nhịp tim": {
    medicines: [
      { name: "Metoprolol 50mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Sáng và tối", note: "Ức chế beta - giảm nhịp tim" },
      { name: "Amiodarone 200mg", dose: "1 viên/lần, ngày 1-3 lần", frequency: "Theo chỉ định bác sĩ", note: "Chống rối loạn nhịp (theo đơn)" },
      { name: "Verapamil 80mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trước ăn", note: "Ức chế kênh canxi" },
      { name: "Aspirin 81mg", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Phòng ngừa đông máu" },
    ],
    advice: "Hạn chế caffeine, rượu, thuốc lá. Giảm stress, ngủ đủ giấc. Theo dõi nhịp tim thường xuyên. Cần khám chuyên khoa tim mạch để đánh giá.",
  },
  "Suy tim": {
    medicines: [
      { name: "Furosemide 40mg", dose: "1 viên/lần, ngày 1-2 lần", frequency: "Sáng sau ăn", note: "Lợi tiểu - giảm phù" },
      { name: "Spironolactone 25mg", dose: "1 viên/lần, ngày 1 lần", frequency: "Sáng hoặc tối", note: "Lợi tiểu giữ kali" },
      { name: "Enalapril 5mg", dose: "1 viên/lần, ngày 1-2 lần", frequency: "Sáng sau ăn", note: "Ức chế men chuyển" },
      { name: "Digoxin 0.25mg", dose: "1 viên/lần, ngày 1 lần", frequency: "Sáng sau ăn", note: "Tăng co tim (theo chỉ định)" },
      { name: "Bisoprolol 5mg", dose: "1 viên/lần, ngày 1 lần", frequency: "Sáng sau ăn", note: "Beta blocker - giảm gánh tim" },
    ],
    advice: "Hạn chế muối, uống nước vừa đủ. Cân nặng ổn định (theo dõi mỗi ngày). Nghỉ ngơi hợp lý. Khám định kỳ theo lịch hẹn.",
  },

  // BỆNH THẦN KINH
  "Đau nửa đầu (Migraine)": {
    medicines: [
      { name: "Paracetamol 500mg", dose: "1-2 viên/lần khi đau", frequency: "Cách 4-6 tiếng, tối đa 8 viên/ngày", note: "Giảm đau nhẹ" },
      { name: "Sumatriptan 50mg", dose: "1 viên/lần khi có aura", frequency: "Có thể lặp lại sau 2 giờ, tối đa 200mg/ngày", note: "Thuốc cắt cơn migraine (theo đơn)" },
      { name: "Rizatriptan 5mg", dose: "1 viên/lần khi đau", frequency: "Có thể lặp lại sau 2 giờ", note: "Thuốc cắt cơn nhanh" },
      { name: "Propranolol 40mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Dự phòng (theo đơn)", note: "Thuốc dự phòng migraine mãn tính" },
      { name: "Flunarizine 5mg", dose: "1 viên/ngày", frequency: "Uống buổi tối", note: "Dự phòng migraine (theo đơn)" },
    ],
    advice: "Nghỉ ngơi trong phòng tối, yên tĩnh khi lên cơn. Tránh các yếu tố gây migraine (stress, thiếu ngủ, đồ ăn特定的). Sử dụng thuốc cắt cơn sớm.",
  },
  "Đau đầu căng thẳng": {
    medicines: [
      { name: "Paracetamol 500mg", dose: "1-2 viên/lần khi đau", frequency: "Cách 4-6 tiếng", note: "Giảm đau" },
      { name: "Ibuprofen 400mg", dose: "1 viên/lần khi đau", frequency: "Cách 6-8 tiếng, sau ăn", note: "Giảm đau, viêm" },
      { name: "Cinnarizin 25mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Sau ăn", note: "Cải thiện tuần hoàn não" },
      { name: "Diphenhydramin 25mg", dose: "1 viên/lần khi mất ngủ kèm đau", frequency: "Uống trước ngủ", note: "Giảm đau + an thần (theo chỉ định)" },
    ],
    advice: "Nghỉ ngơi, giảm stress, thư giãn. Massage vùng đầu, cổ. Điều chỉnh tư thế làm việc. Ngủ đủ giấc 7-8 tiếng/đêm.",
  },
  "Rối loạn tiền đình": {
    medicines: [
      { name: "Cinnarizin 25mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Sau ăn", note: "Cải thiện tuần hoàn tiền đình" },
      { name: "Flunarizine 5mg", dose: "1 viên/ngày", frequency: "Uống buổi tối", note: "Ổn định thần kinh tiền đình" },
      { name: "Betahistine 6mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Sau ăn", note: "Cải thiện tuần hoàn tai trong" },
      { name: "Domperidon 10mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trước ăn", note: "Giảm nôn, buồn nôn" },
    ],
    advice: "Nghỉ ngơi, tránh thay đổi tư thế đột ngột. Tập bài tập tiền đình theo hướng dẫn. Ngủ với đầu cao. Khám chuyên khoa nếu chóng mặt kéo dài.",
  },
  "Mất ngủ": {
    medicines: [
      { name: "Diphenhydramin 25mg", dose: "1-2 viên/lần", frequency: "Uống trước ngủ 30 phút", note: "Thuốc an thần gây ngủ (ngắn hạn)" },
      { name: "Diazepam 5mg", dose: "1 viên/lần", frequency: "Uống trước ngủ (theo đơn)", note: "Thuốc an thần (ngắn hạn)" },
      { name: "Zolpidem 10mg", dose: "1 viên/lần", frequency: "Uống trước ngủ (theo đơn)", note: "Thuốc ngủ (ngắn hạn)" },
      { name: "Melatonin 3mg", dose: "1 viên/lần", frequency: "Uống 30-60 phút trước ngủ", note: "Hỗ trợ giấc ngủ tự nhiên" },
      { name: "Valerian 300mg", dose: "1-2 viên/lần", frequency: "Uống trước ngủ", note: "Thảo dược an thần" },
    ],
    advice: "Không uống caffeine buổi chiều/tối. Giữ lịch ngủ cố định. Không dùng điện thoại/TV trước ngủ. Phòng ngủ yên tĩnh, tối. Thuốc ngủ chỉ dùng ngắn hạn.",
  },
  "Đau dây thần kinh tọa": {
    medicines: [
      { name: "Diclofenac 50mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Sau ăn", note: "Giảm đau, viêm" },
      { name: "Gabapentin 300mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Tăng dần theo chỉ định", note: "Giảm đau thần kinh (theo đơn)" },
      { name: "Pregabalin 75mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Theo chỉ định", note: "Giảm đau thần kinh" },
      { name: "Vitamin B1+B6+B12", dose: "1 viên/ngày", frequency: "Sau ăn", note: "Hỗ trợ thần kinh" },
      { name: "Mecobalamin 500mcg", dose: "1 viên/ngày", frequency: "Sau ăn", note: "Phục hồi thần kinh" },
    ],
    advice: "Nghỉ ngơi, tránh mang vác nặng. Chườm nóng vùng đau. Tập vật lý trị liệu. Khám chuyên khoa nếu đau không giảm sau 2 tuần.",
  },

  // BỆNH TIẾT NIỆU
  "Viêm đường tiết niệu": {
    medicines: [
      { name: "Ciprofloxacin 500mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 7 ngày (theo đơn)", note: "Kháng sinh trị nhiễm trùng" },
      { name: "Norfloxacin 400mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 7 ngày (theo đơn)", note: "Kháng sinh đường tiết niệu" },
      { name: "Fosfomycin 3g", dose: "1 gói uống 1 lần", frequency: "Liều đơn hoặc theo chỉ định", note: "Kháng sinh liều đơn" },
      { name: "Phenazopyridine 100mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trong 2-3 ngày (giảm triệu chứng)", note: "Giảm đau tiểu, đái rắt" },
    ],
    advice: "Uống nhiều nước (2-3 lít/ngày). Không nhịn tiểu. Giữ vệ sinh vùng kín. Tránh đồ uống có cồn, caffeine. Khám lại nếu triệu chứng không cải thiện sau 3 ngày.",
  },
  "Viêm bàng quang": {
    medicines: [
      { name: "Norfloxacin 400mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 7 ngày (theo đơn)", note: "Kháng sinh" },
      { name: "Ciprofloxacin 500mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 7 ngày (theo đơn)", note: "Kháng sinh" },
      { name: "Spasmex 10mg", dose: "1 viên/lần, ngài 3 lần", frequency: "Trước ăn", note: "Giảm co thắt bàng quang" },
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi đau", frequency: "Cách 4-6 tiếng", note: "Giảm đau" },
    ],
    advice: "Uống đủ nước, đi tiểu thường xuyên. Giữ vệ sinh. Tránh caffeine, rượu. Đặt nước ấm lên bụng dưới để giảm đau.",
  },
  "Sỏi thận": {
    medicines: [
      { name: "Diclofenac 50mg", dose: "1 viên/lần khi đau", frequency: "Sau ăn", note: "Giảm đau colic thận" },
      { name: "Tamsulosin 0.4mg", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Giãn cơ niệu quản, giúp sỏi di chuyển" },
      { name: "Allopurinol 300mg", dose: "1 viên/ngày", frequency: "Sau ăn (phòng sỏi uric)", note: "Giảm acid uric" },
      { name: "Potassium citrate", dose: "1 thìa/ngày", frequency: "Theo chỉ định", note: "Kiềm hóa nước tiểu, phòng sỏi" },
    ],
    advice: "Uống nhiều nước (3-4 lít/ngày). Hạn chên thức ăn giàu oxalate (đậu phụ, chocolate, cà phê). Tập thể dục đều đặn. Khám nếu đau dữ dội hoặc sốt.",
  },
  "Viêm thận-bể thận cấp": {
    medicines: [
      { name: "Ceftriaxone 1g", dose: "1g tiêm tĩnh mạch/ngày", frequency: "Theo đơn (cơ sở y tế)", note: "Kháng sinh tĩnh mạch" },
      { name: "Ciprofloxacin 500mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 10-14 ngày (theo đơn)", note: "Kháng sinh đường uống" },
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi sốt, đau", frequency: "Cách 4-6 tiếng", note: "Hạ sốt, giảm đau" },
      { name: "Furosemide 40mg", dose: "1 viên/lần, ngày 1-2 lần", frequency: "Sáng sau ăn", note: "Lợi tiểu (theo chỉ định)" },
    ],
    advice: "Cần nhập viện điều trị. Uống nhiều nước. Theo dõi nước tiểu. Khám ngay nếu sốt cao, đau lưng dữ dội, tiểu ít.",
  },

  // BỆNH CƠ XƯƠNG KHỚP
  "Thoái hóa khớp": {
    medicines: [
      { name: "Diclofenac 50mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Sau ăn", note: "Giảm đau, viêm" },
      { name: "Meloxicam 7.5mg", dose: "1 viên/ngày", frequency: "Sau ăn", note: "NSAID chọn lọc dạ dày" },
      { name: "Glucosamine 1500mg", dose: "1 gói hoặc 2 viên/ngày", frequency: "Sáng và tối", note: "Bổ sung dịch khớp" },
      { name: "Calcium D3", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Bổ sung canxi, vitamin D" },
      { name: "Vitamin B1+B6+B12", dose: "1 viên/ngày", frequency: "Sau ăn", note: "Hỗ trợ thần kinh" },
    ],
    advice: "Giảm cân nếu thừa cân. Tập thể dục nhẹ (đi bộ, bơi lội). Chườm nóng khi đau. Tránh mang vác nặng. Khám định kỳ.",
  },
  "Viêm khớp": {
    medicines: [
      { name: "Diclofenac 50mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Sau ăn", note: "Giảm đau, viêm" },
      { name: "Colchicine 0.6mg", dose: "1 viên/lần, ngày 2-4 lần", frequency: "Trong cơn gout (theo đơn)", note: "Điều trị gout cấp" },
      { name: "Allopurinol 300mg", dose: "1 viên/ngày", frequency: "Sau ăn", note: "Giảm acid uric (dự phòng gout)" },
      { name: "Prednisolon 5mg", dose: "1-2 viên/lần, ngày 2 lần", frequency: "Trong 5-7 ngày (theo đơn)", note: "Giảm viêm nặng" },
    ],
    advice: "Hạn chế đồ ăn giàu purin (thịt đỏ, hải sản, rượu bia). Uống nhiều nước. Giữ khớp nghỉ ngơi khi cơn cấp. Chườm lạnh khi sưng đỏ.",
  },
  "Đau thắt lưng": {
    medicines: [
      { name: "Diclofenac 50mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Sau ăn", note: "Giảm đau, viêm" },
      { name: "Methylprednisolone 4mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 5 ngày (theo đơn)", note: "Giảm viêm cấp" },
      { name: "Vitamin B1+B6+B12", dose: "1 viên/ngày", frequency: "Sau ăn", note: "Hỗ trợ thần kinh" },
      { name: "Calcium D3", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Bổ sung canxi" },
      { name: "Diclofenac gel", dose: "Bôi 3-4 lần/ngày", frequency: "Bôi tại chỗ", note: "Giảm đau tại chỗ" },
    ],
    advice: "Nghỉ ngơi tương đối (2-3 ngày). Tránh bê vác nặng. Chườm nóng. Tập vật lý trị liệu. Ngủ với gối kê chân.",
  },
  "Thoái hóa cột sống": {
    medicines: [
      { name: "Diclofenac 50mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Sau ăn", note: "Giảm đau, viêm" },
      { name: "Meloxicam 7.5mg", dose: "1 viên/ngày", frequency: "Sau ăn", note: "Giảm đau mãn tính" },
      { name: "Gabapentin 300mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Tăng dần (theo đơn)", note: "Giảm đau thần kinh" },
      { name: "Vitamin B1+B6+B12", dose: "1 viên/ngày", frequency: "Sau ăn", note: "Hỗ trợ thần kinh" },
      { name: "Calcium D3", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Bổ sung canxi" },
    ],
    advice: "Tập thể dục đều đặn (bơi lội, đi bộ). Duy trì tư thế đúng. Giảm cân nếu thừa cân. Tránh ngồi lâu. Vật lý trị liệu.",
  },

  // BỆNH NỘI TIẾT
  "Đái tháo đường type 2": {
    medicines: [
      { name: "Metformin 500mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Sáng và tối sau ăn", note: "Thuốc điều trị đái tháo đường đầu tay" },
      { name: "Glipizide 5mg", dose: "1 viên/lần, ngày 1-2 lần", frequency: "Trước ăn", note: "Kích thích tiết insulin (theo đơn)" },
      { name: "Acarbose 50mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Với bữa ăn", note: "Ức chế hấp thu đường" },
      { name: "Empagliflozin 10mg", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Thuốc mới - thải đường qua thận" },
      { name: "Linagliptin 5mg", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Thuốc ức chế DPP-4" },
    ],
    advice: "Ăn theo chế độ low-carb, hạn chế đường, tinh bột. Tập thể dục 30 phút/ngày. Theo dõi đường huyết thường xuyên. Khám định kỳ 3 tháng/lần.",
  },
  "Cường giáp": {
    medicines: [
      { name: "Methimazole 10mg", dose: "1 viên/lần, ngày 1-3 lần", frequency: "Theo chỉ định bác sĩ", note: "Ức chế tuyến giáp (theo đơn)" },
      { name: "Propranolol 40mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trước ăn", note: "Giảm nhịp tim, run" },
      { name: "Potassium iodide 50mg", dose: "1 viên/ngày", frequency: "Theo chỉ định", note: "Giảm tiết giáp (trong cơn)" },
    ],
    advice: "Hạn chế đồ ăn giàu iodine (hải sản, rong biển). Giảm stress, ngủ đủ giấc. Theo dõi nhịp tim. Khám định kỳ, xét nghiệm T3, T4, TSH.",
  },
  "Suy giáp": {
    medicines: [
      { name: "Levothyroxine 50mcg", dose: "1 viên/lần, ngày 1 lần", frequency: "Sáng sớm khi đói", note: "Hormone giáp thay thế (theo đơn)" },
      { name: "Levothyroxine 100mcg", dose: "1 viên/lần, ngày 1 lần", frequency: "Sáng sớm khi đói", note: "Liều cao hơn (theo chỉ định)" },
    ],
    advice: "Uống thuốc vào buổi sáng, khi đói, trước ăn ít nhất 30 phút. Không uống cùng với calcium, sắt (cách 4 giờ). Theo dõi TSH định kỳ.",
  },

  // BỆNH DA LIỄU
  "Viêm da dị ứng": {
    medicines: [
      { name: "Cetirizine 10mg", dose: "1 viên/ngày", frequency: "Uống buổi sáng", note: "Kháng histamin - giảm ngứa" },
      { name: "Hydrocortison 1%", dose: "Bôi 2-3 lần/ngày", frequency: "Bôi mỏng vùng tổn thương", note: "Corticoid nhẹ" },
      { name: "Clobetasol 0.05%", dose: "Bôi 1-2 lần/ngày", frequency: "Bôi mỏng (theo đơn)", note: "Corticoid mạnh (viêm da nặng)" },
      { name: "Tacrolimus 0.1%", dose: "Bôi 2 lần/ngày", frequency: "Bôi mỏng (theo đơn)", note: "Thuốc ức chế calcineurin" },
      { name: "Emolient", dose: "Bôi 2-3 lần/ngày", frequency: "Dưỡng ẩm da", note: "Dưỡng ẩm, phục hồi da" },
    ],
    advice: "Tránh tác nhân gây dị ứng. Giữ da sạch, khô. Không gãi. Dùng kem dưỡng ẩm thường xuyên. Khám nếu tổn thương lan rộng.",
  },
  "Mề đay": {
    medicines: [
      { name: "Cetirizine 10mg", dose: "1 viên/ngày", frequency: "Uống buổi sáng", note: "Kháng histamin" },
      { name: "Loratadine 10mg", dose: "1 viên/ngày", frequency: "Uống buổi sáng", note: "Kháng histamin" },
      { name: "Hydroxyzine 25mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Theo chỉ định", note: "Kháng histamin gây ngủ" },
      { name: "Prednisolon 5mg", dose: "1-2 viên/lần, ngày 2 lần", frequency: "Trong 3-5 ngày (theo đơn)", note: "Cho mề đay nặng" },
    ],
    advice: "Tránh thức ăn, thuốc gây dị ứng. Mặc quần áo rộng, thoáng mát. Chườm lạnh giảm ngứa. Nếu sưng môi, khó thở gọi 115 ngay.",
  },
  "Nấm da": {
    medicines: [
      { name: "Clotrimazole 1%", dose: "Bôi 2 lần/ngày", frequency: "Bôi mỏng 2 tuần", note: "Thuốc chống nấm" },
      { name: "Miconazole 2%", dose: "Bôi 2 lần/ngày", frequency: "Bôi 2-4 tuần", note: "Thuốc chống nấm" },
      { name: "Terbinafine 250mg", dose: "1 viên/ngày", frequency: "Trong 2-6 tuần (theo đơn)", note: "Thuốc uống trị nấm" },
      { name: "Fluconazole 150mg", dose: "1 viên/lần/tuần", frequency: "Trong 2-4 tuần (theo đơn)", note: "Thuốc uống trị nấm" },
    ],
    advice: "Giữ vùng da bị nấm khô ráo. Thay tất, quần áo hàng ngày. Không dùng chung khăn tắm. Tránh cào gãi. Điều trị đủ thời gian.",
  },
  "Vẩy nến": {
    medicines: [
      { name: "Betamethasone 0.05%", dose: "Bôi 2 lần/ngày", frequency: "Bôi mỏng vùng tổn thương", note: "Corticoid mạnh" },
      { name: "Calcipotriol 0.005%", dose: "Bôi 2 lần/ngày", frequency: "Bôi mỏng", note: "Thuốc điều trị vẩy nến" },
      { name: "Methotrexate 2.5mg", dose: "1-2 viên/tuần", frequency: "Theo chỉ định bác sĩ", note: "Thuốc điều trị nặng (theo đơn)" },
      { name: "Tacrolimus 0.1%", dose: "Bôi 2 lần/ngày", frequency: "Bôi mỏng (theo đơn)", note: "Cho vùng da mỏng" },
    ],
    advice: "Tránh stress, tổn thương da. Giữ ẩm da. Tắm nắng nhẹ buổi sáng. Tránh rượu, hút thuốc. Khám định kỳ theo dõi.",
  },

  // BỆNH TAI MŨI HỌNG
  "Viêm tai giữa": {
    medicines: [
      { name: "Amoxicillin 500mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trong 7-10 ngày (theo đơn)", note: "Kháng sinh" },
      { name: "Azithromycin 500mg", dose: "1 viên/ngày", frequency: "Trong 5 ngày (theo đơn)", note: "Kháng sinh thay thế" },
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi đau, sốt", frequency: "Cách 4-6 tiếng", note: "Giảm đau, hạ sốt" },
      { name: "Phenylephrine nasal", dose: "Nhỏ 2-3 giọt/mũi, ngày 3 lần", frequency: "Trong 3-5 ngày", note: "Giảm nghẹt mũi" },
    ],
    advice: "Giữ tai khô, tránh nước vào tai. Chườm ấm vùng tai. Không dùng tăm bông. Khám nếu đau tăng, sốt cao hoặc giảm thính lực.",
  },
  "Viêm thanh quản": {
    medicines: [
      { name: "Dexamethasone 0.5mg", dose: "1 viên/lần, ngày 2-3 lần", frequency: "Trong 3 ngày (theo đơn)", note: "Giảm sưng thanh quản" },
      { name: "Prednisolon 5mg", dose: "1-2 viên/lần, ngày 2 lần", frequency: "Trong 3-5 ngày (theo đơn)", note: "Giảm viêm" },
      { name: "Chlorpheniramin 4mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Khi khàn tiếng", note: "Giảm phù thanh quản" },
      { name: "Thuốc súc họng", dose: "Súc họng 3-4 lần/ngày", frequency: "Sau ăn", note: "Sát khuẩn, giảm đau" },
    ],
    advice: "Nói ít, không nói to. Uống nước ấm. Tránh đồ lạnh, caffeine. Giữ ấm cổ. Không hút thuốc. Khám nếu khó thở, nuốt khó.",
  },

  // BỆNH MẮT
  "Viêm kết mạc": {
    medicines: [
      { name: "Tobramycin 0.3%", dose: "Nhỏ 1-2 giọt/lần, ngày 3-4 lần", frequency: "Nhỏ mắt", note: "Kháng sinh trị viêm (theo đơn)" },
      { name: "Ciprofloxacin 0.3%", dose: "Nhỏ 1-2 giọt/lần, ngày 3-4 lần", frequency: "Nhỏ mắt", note: "Kháng sinh (theo đơn)" },
      { name: "Olopatadine 0.1%", dose: "Nhỏ 1 giọt/lần, ngày 2 lần", frequency: "Nhỏ mắt", note: "Thuốt trị dị ứng" },
      { name: "Refresh Plus", dose: "Nhỏ 1-2 giọt/lần khi khô", frequency: "Khi cần", note: "Nước mắt nhân tạo" },
    ],
    advice: "Rửa tay trước khi chạm vào mắt. Không dùng chung khăn mặt. Tránh trang điểm mắt. Đeo kính khi ra ngoài. Khám nếu đau tăng, nhìn mờ.",
  },
  "Khô mắt": {
    medicines: [
      { name: "Refresh Plus", dose: "Nhỏ 1-2 giọt/lần, ngày 3-4 lần", frequency: "Khi cần", note: "Nước mắt nhân tạo" },
      { name: "Systane Ultra", dose: "Nhỏ 1-2 giọt/lần, ngày 3-4 lần", frequency: "Khi cần", note: "Nước mắt nhân tạo" },
      { name: "Cequa", dose: "Nhỏ 1 giọt/lần, ngày 2 lần", frequency: "Sáng và tối", note: "Kích thích tiết nước mắt" },
      { name: "Restasis", dose: "Nhỏ 1 giọt/lần, ngày 2 lần", frequency: "Sáng và tối", note: "Trị khô mắt mãn tính" },
    ],
    advice: "Hạn chế thời gian nhìn màn hình. Dùng máy tạo ẩm. Đeo kính bảo hộ khi ra ngoài. Chớp mắt thường xuyên. Uống đủ nước.",
  },

  // BỆNH SẢN PHỤ KHOA
  "Viêm âm đạo": {
    medicines: [
      { name: "Metronidazole 500mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 7 ngày (theo đơn)", note: "Trị viêm do vi khuẩn" },
      { name: "Clotrimazole 500mg", dose: "1 viên đặt/ngày", frequency: "Đặt vào buổi tối, 6 ngày", note: "Trị nấm" },
      { name: "Fluconazole 150mg", dose: "1 viên uống 1 lần", frequency: "Theo chỉ định", note: "Trị nấm" },
      { name: "Doxycycline 100mg", dose: "1 viên/lần, ngày 2 lần", frequency: "Trong 7 ngày (theo đơn)", note: "Trị nhiễm trùng" },
    ],
    advice: "Giữ vùng kín khô ráo. Mặc quần áo thoáng. Tránh thụt rửa âm đạo. Điều trị cả hai vợ chồng nếu cần. Khám lại sau điều trị.",
  },
  "Đau kinh nguyệt": {
    medicines: [
      { name: "Ibuprofen 400mg", dose: "1 viên/lần khi đau", frequency: "Cách 6-8 tiếng, tối đa 3 ngày", note: "Giảm đau, viêm" },
      { name: "Mefenamic acid 500mg", dose: "1 viên/lần khi đau", frequency: "Cách 6 tiếng", note: "Giảm đau kinh" },
      { name: "Drotaverine 40mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Khi đau", note: "Giảm co thắt tử cung" },
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi đau", frequency: "Cách 4-6 tiếng", note: "Giảm đau nhẹ" },
    ],
    advice: "Chườm nóng bụng dưới. Nghỉ ngơi, giảm stress. Tránh đồ lạnh. Tập thể dục nhẹ. Uống nước ấm. Nếu đau nặng mỗi tháng cần khám.",
  },

  // BỆNH TÂM THẦN
  "Trầm cảm": {
    medicines: [
      { name: "Fluoxetine 20mg", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Thuốc chống trầm cảm (SSRI)" },
      { name: "Sertraline 50mg", dose: "1 viên/ngày", frequency: "Sáng hoặc tối", note: "Thuốc chống trầm cảm (SSRI)" },
      { name: "Escitalopram 10mg", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Thuốc chống trầm cảm (SSRI)" },
      { name: "Amitriptyline 25mg", dose: "1 viên/lần, ngày 1-2 lần", frequency: "Uống buổi tối (gây buồn ngủ)", note: "Thuốc chống trầm cảm 3 vòng" },
    ],
    advice: "Tập thể dục đều đặn. Ngủ đủ giấc. Chia sẻ với người thân. Tham gia hoạt động xã hội. Điều trị ít nhất 6 tháng. Khám định kỳ.",
  },
  "Rối loạn lo âu": {
    medicines: [
      { name: "Escitalopram 10mg", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Thuốc chống lo âu (SSRI)" },
      { name: "Sertraline 50mg", dose: "1 viên/ngày", frequency: "Sáng sau ăn", note: "Thuốc chống lo âu" },
      { name: "Buspirone 10mg", dose: "1 viên/lần, ngày 2-3 lần", frequency: "Theo chỉ định", note: "Thuốc chống lo âu không gây nghiện" },
      { name: "Diazepam 5mg", dose: "1 viên/lần khi lo lắng nặng", frequency: "Tối đa 2 lần/ngày (ngắn hạn)", note: "Thuốm an thần (ngắn hạn)" },
    ],
    advice: "Tập thở sâu, thiền định. Hạn chế caffeine. Ngủ đủ giấc. Tập thể dục đều đặn. Tránh rượu, thuốc lá. Tư vấn tâm lý kết hợp.",
  },

  // BỆNH NHI
  "Sốt cao co giật ở trẻ": {
    medicines: [
      { name: "Paracetamol 150mg (súp)", dose: "1 thìa/lần khi sốt >38°C", frequency: "Cách 4-6 tiếng, tối đa 4 liều/ngày", note: "Hạ sốt cho trẻ" },
      { name: "Ibuprofen 100mg/5ml", dose: "1 thìa/lần, ngày 3 lần", frequency: "Sau ăn, cách 6-8 tiếng", note: "Hạ sốt, giảm đau" },
      { name: "Diazepam 5mg", dose: "1/2 viên hoặc theo cân nặng", frequency: "Khi co giật (theo đơn)", note: "Cắt cơn co giật (cấp cứu)" },
      { name: "Phenobarbital", dose: "Theo cân nặng", frequency: "Theo chỉ định bác sĩ", note: "Dự phòng co giật (theo đơn)" },
    ],
    advice: "Cho trẻ mặc quần áo thoáng. Chườm nước ấm. Cho uống nước, sữa thường xuyên. Nếu co giật đặt trẻ nằm nghiêng, gọi 115. Không cho ăn gì khi đang co giật.",
  },
  "Tiêu chảy ở trẻ": {
    medicines: [
      { name: "ORS (Oresol)", dose: "1 gói pha 200ml", frequency: "Uống liên tục thay nước", note: "Bù nước, điện giải" },
      { name: "Smecta", dose: "1 gói/lần, ngày 2-3 lần", frequency: "Pha với nước, uống giữa bữa", note: "Hấp thụ vi khuẩn" },
      { name: "Zinc 20mg", dose: "1 viên/ngày", frequency: "Trong 10-14 ngày", note: "Bổ sung kẽm, giảm tiêu chảy" },
      { name: "Lactobacillus", dose: "1 gói/ngày", frequency: "Pha với nước", note: "Vi khuẩn có lợi" },
    ],
    advice: "Cho trẻ uốngORS liên tục. Cho bú sữa mẹ bình thường. Ăn cháo loãng. Theo dõi nước tiểu (ít nước tiểu = mất nước). Khám nếu sốt, nôn liên tục.",
  },

  // BỆNH RĂNG HÀM MẶT
  "Đau răng": {
    medicines: [
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi đau", frequency: "Cách 4-6 tiếng", note: "Giảm đau răng" },
      { name: "Ibuprofen 400mg", dose: "1 viên/lần, ngày 2-3 lần", frequency: "Sau ăn", note: "Giảm đau, viêm" },
      { name: "Metronidazole 250mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trong 5-7 ngày (theo đơn)", note: "Kháng sinh trị viêm nướu" },
      { name: "Amoxicillin 500mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trong 5-7 ngày (theo đơn)", note: "Kháng sinh" },
      { name: "Chlorhexidine 0.12%", dose: "Súc miệng 2 lần/ngày", frequency: "Sau đánh răng", note: "Sát khuẩn" },
    ],
    advice: "Súc miệng nước muối ấm. Chườm nước đá bên ngoài má. Không nhai bên đau. Đặt gạc tê tại chỗ nếu đau nặng. Khám nha khoa sớm.",
  },
  "Viêm nướu": {
    medicines: [
      { name: "Chlorhexidine 0.12%", dose: "Súc miệng 2 lần/ngày", frequency: "Sau đánh răng, không nuốt", note: "Sát khuẩn" },
      { name: "Metronidazole 250mg", dose: "1 viên/lần, ngày 3 lần", frequency: "Trong 5 ngày (theo đơn)", note: "Kháng sinh" },
      { name: "Dexamethasone", dose: "Nhỏ 3-4 lần/ngày", frequency: "Tại chỗ (theo chỉ định)", note: "Giảm viêm" },
      { name: "Paracetamol 500mg", dose: "1 viên/lần khi đau", frequency: "Cách 4-6 tiếng", note: "Giảm đau" },
    ],
    advice: "Đánh răng đều đặn 2 lần/ngày. Dùng chỉ nha khoa. Súc miệng nước muối. Hạn chế đồ ngọt. Khám nha khoa định kỳ 6 tháng.",
  },
};

// Hàm gợi ý thuốc theo bệnh cụ thể
export const getDrugsByDisease = (diseaseName) => {
  const normalizedDisease = Object.keys(diseaseMedications).find(key =>
    key.toLowerCase().includes(diseaseName.toLowerCase())
  );
  
  if (normalizedDisease) {
    return diseaseMedications[normalizedDisease];
  }
  
  return null;
};

// Hàm gợi ý thuốc theo triệu chứng - phiên bản mở rộng
export const getMedicationBySymptoms = (symptoms) => {
  const normalized = normalize(symptoms);
  const results = [];
  
  // Map triệu chứng sang bệnh
  const symptomToDisease = {
    "cảm cúm": "Cảm cúm",
    "sốt": "Cảm cúm",
    "ho": "Viêm phế quản",
    "đờm": "Viêm phế quản",
    "đau họng": "Viêm họng",
    "viêm họng": "Viêm họng",
    "đau bụng": "Viêm dạ dày",
    "nôn": "Viêm dạ dày",
    "tiêu chảy": "Tiêu chảy cấp",
    "táo bón": "Táo bón",
    "đau ngực": "Đau thắt ngực",
    "huyết áp cao": "Tăng huyết áp",
    "tăng huyết áp": "Tăng huyết áp",
    "đau đầu": "Đau nửa đầu",
    "chóng mặt": "Rối loạn tiền đình",
    "mất ngủ": "Mất ngủ",
    "tiểu buốt": "Viêm đường tiết niệu",
    "tiểu rắt": "Viêm đường tiết niệu",
    "đau lưng": "Đau thắt lưng",
    "đau khớp": "Viêm khớp",
    "sưng khớp": "Viêm khớp",
    "đái tháo đường": "Đái tháo đường type 2",
    "tiểu đường": "Đái tháo đường type 2",
    "ngứa": "Viêm da dị ứng",
    "nổi mẩn": "Mề đay",
    "đau tai": "Viêm tai giữa",
    "khàn tiếng": "Viêm thanh quản",
    "đỏ mắt": "Viêm kết mạc",
    "khô mắt": "Khô mắt",
    "đau kinh": "Đau kinh nguyệt",
    "lo âu": "Rối loạn lo âu",
    "trầm cảm": "Trầm cảm",
    "sốt cao trẻ": "Sốt cao co giật ở trẻ",
    "tiêu chảy trẻ": "Tiêu chảy ở trẻ",
    "đau răng": "Đau răng",
    "viêm nướu": "Viêm nướu",
  };
  
  for (const [key, disease] of Object.entries(symptomToDisease)) {
    if (normalized.includes(key)) {
      const diseaseData = diseaseMedications[disease];
      if (diseaseData) {
        results.push({
          disease,
          ...diseaseData
        });
      }
    }
  }
  
  return results;
};

// Get medication suggestions based on symptoms and diagnosis
export const getMedicationSuggestions = (symptoms, diagnosis) => {
  const combinedText = `${symptoms || ""} ${diagnosis || ""}`.toLowerCase();
  
  const matchedProfiles = detectProfiles(combinedText);
  
  if (matchedProfiles.length === 0) {
    return {
      suggestions: [],
      message: "Chưa có gợi ý thuốc phù hợp. Vui lòng tham khảo ý kiến bác sĩ.",
    };
  }
  
  const topProfile = matchedProfiles[0].profile;
  const meds = medicationRecommendations[topProfile.name] || [];
  
  return {
    suggestions: meds,
    matchedProfile: topProfile.name,
    message: meds.length > 0 
      ? `Gợi ý thuốc cho triệu chứng ${topProfile.name}. Vui lòng tham khảo ý kiến bác sĩ trước khi sử dụng.`
      : "Chưa có gợi ý thuốc phù hợp. Vui lòng tham khảo ý kiến bác sĩ.",
  };
};

const buildProfessionalFallback = (message) => {
  const text = normalize(message);
  if (!text) {
    return "Tôi cần thêm thông tin để hỗ trợ chính xác hơn. Bạn vui lòng mô tả triệu chứng chính, thời gian xuất hiện, mức độ nặng nhẹ và bệnh sơ nếu có.";
  }

  if (text.includes("đặt lịch") || text.includes("hẹn khám")) {
    return "Bạn có thể vào tab Bác sĩ để đặt lịch theo chuyên khoa. Nếu cần, tôi sẽ gợi ý chuyên khoa dựa trên triệu chứng bạn đang gặp.";
  }

  const emergencyMatches = detectEmergency(text);
  if (emergencyMatches.length > 0) {
    const reasons = emergencyMatches.map((item) => item.advice).join(" ");
    return `${reasons}. ${safetyNote}`;
  }

  const matchedProfiles = detectProfiles(text);
  const top = matchedProfiles[0]?.profile;
  const second = matchedProfiles[1]?.profile;
  const duration = parseDuration(text);
  
  const severityAdvice = top ? getSeverityAdvice(top, text) : null;

  if (!top) {
    return "Tôi đã ghi nhận triệu chứng của bạn, nhưng thông tin hiện tại chưa đủ để định hướng chuyên khoa. Bạn vui lòng bổ sung: triệu chứng chính, thời gian kéo dài, mức độ, sốt/huyết áp và thuốc đang dùng. " + safetyNote;
  }

  const possibleList = top.possibilities.slice(0, 3).join(", ");
  const actionList = top.actions.join(", ");
  const extra = second ? `Ngoài ra, cần theo dõi thêm nhóm triệu chứng ${second.name}.` : "Nếu triệu chứng tăng nhanh hoặc kéo dài trên 48 giờ, nên khám trực tiếp.";
  const questions = buildClarifyQuestions(top);

  let response = `Phân tích sơ bộ: Triệu chứng nghiêng về nhóm ${top.name}. `;
  response += `Thời gian triệu chứng: ${duration}. `;
  response += `Khả năng cần theo dõi: ${possibleList}. `;
  response += `Hướng xử trí trước mắt: ${actionList}. `;
  if (severityAdvice) {
    response += `Lưu ý quan trọng: ${severityAdvice}. `;
  }
  response += `Chuyên khoa gợi ý: ${top.specialty}. ${extra} `;
  response += `Câu hỏi bổ sung: 1) ${questions[0]}, 2) ${questions[1]}. `;
  response += `Lưu ý: Đây là hỗ trợ tham khảo, không thay thế chẩn đoán bác sĩ. ${safetyNote}`;

  return response;
};

const buildChattyFallback = (message) => {
  const text = normalize(message);
  if (!text) {
    return "Mình cần thêm thông tin để tư vấn sát hơn. Bạn mô tả giúp mình triệu chứng chính, bắt đầu từ lúc nào, và mức độ nặng nhẹ nhé?";
  }

  if (text.includes("đặt lịch") || text.includes("hẹn khám")) {
    return "Bạn vào tab Bác sĩ để đặt lịch nhé. Nếu muốn, mình có thể gợi ý chuyên khoa phù hợp trước khi bạn đặt lịch.";
  }

  const emergencyMatches = detectEmergency(text);
  if (emergencyMatches.length > 0) {
    const reasons = emergencyMatches.map((item) => item.advice).join(" ");
    return `Nghe triệu chứng bạn tả, mình lo là có nguy cơ cấp cứu. ${reasons}. ${safetyNote}`;
  }

  const matchedProfiles = detectProfiles(text);
  const top = matchedProfiles[0]?.profile;
  const second = matchedProfiles[1]?.profile;
  const duration = parseDuration(text);
  
  const severityAdvice = top ? getSeverityAdvice(top, text) : null;

  if (!top) {
    return `Mình đã ghi nhận triệu chứng của bạn, nhưng hiện chưa đủ để định hướng chuyên khoa cho chuẩn. Bạn bổ sung giúp mình: đau ở đâu, kéo dài bao lâu, có sốt hay không, và đã dùng thuốc gì rồi? ${safetyNote}`;
  }

  const possibleList = top.possibilities.slice(0, 3).join(", ");
  const actionList = top.actions.join(", ");
  const extra = second ? `Ngoài ra, cần theo dõi thêm nhóm triệu chứng ${second.name}.` : "Nếu triệu chứng tăng nhanh hoặc kéo dài trên 48 giờ, nên khám trực tiếp.";
  const questions = buildClarifyQuestions(top);

  let response = `Mình đọc triệu chứng của bạn rồi, hiện tại nó nghiêng về nhóm ${top.name}. `;
  response += `Thường có thể gặp: ${possibleList}. `;
  response += `Tạm thời bạn làm giúp mình như này nhé: ${actionList}. `;
  if (severityAdvice) {
    response += `⚠️ Lưu ý quan trọng: ${severityAdvice}. `;
  }
  response += `Nếu được, bạn nên khám chuyên khoa ${top.specialty}. ${extra} `;
  response += `Cho mình hỏi thêm 2 ý để đánh giá sát hơn: ${questions[0]}, ${questions[1]}. `;
  response += `Mình nhắc lại để an toàn: đây là gợi ý tham khảo, không thay thế chẩn đoán trực tiếp. ${safetyNote}. `;
  response += `Thời gian triệu chứng hiện là ${duration}, đạn?`;

  return response;
};

let client = null;
const getClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
};

const systemPromptChatty = [
  "Bạn là HealthyAI Assistant, trợ lý hỗ trợ triệu chứng sức khỏe bằng tiếng Việt.",
  "Viết như đang chat với người thật, xưng hô 'mình - bạn', gọn tự nhiên và thân thiện.",
  "Trả lời ngắn gọn 4-7 câu, có dấu câu đầy đủ, không viết kiểu báo cáo khô khan.",
  "Mục tiêu: hướng dẫn an toàn, phân loại triệu chứng, gợi ý chuyên khoa và bước tiếp theo.",
  "Không đưa chẩn đoán khẳng định, không kê đơn thuốc chi tiết.",
  "Khi có dấu hiệu nguy hiểm, ưu tiên khuyên cấp cứu 115 ngay.",
  "Kết thúc bằng 1-2 câu hỏi để lấy thêm thông tin triệu chứng.",
].join(" ");

const systemPromptProfessional = [
  "Bạn là HealthyAI Assistant, trợ lý hỗ trợ triệu chứng sức khỏe bằng tiếng Việt.",
  "Viết theo phong cách chuyên nghiệp, gọn ràng, trang trọng vừa đủ.",
  "Trả lời 5-8 câu, có dấu câu đầy đủ, dễ hiểu.",
  "Mục tiêu: hướng dẫn an toàn, phân loại triệu chứng, gợi ý chuyên khoa và bước tiếp theo.",
  "Không đưa chẩn đoán khẳng định, không kê đơn thuốc chi tiết.",
  "Khi có dấu hiệu nguy hiểm, ưu tiên khuyên cấp cứu 115 ngay.",
  "Kết thúc bằng 1-2 câu hỏi bổ sung để làm rõ thông tin.",
].join(" ");

export const generateSupportReply = async (history, userMessage, options = {}) => {
  const mood = normalizeMood(options.mood);
  const openai = getClient();

  const rawFallback =
    mood === AI_MOODS.PROFESSIONAL
      ? buildProfessionalFallback(userMessage)
      : buildChattyFallback(userMessage);
  const fallback =
    mood === AI_MOODS.PROFESSIONAL
      ? toProfessionalText(rawFallback)
      : toFriendlyChat(rawFallback);

  if (!openai) return fallback;

  const messages = [
    {
      role: "system",
      content: mood === AI_MOODS.PROFESSIONAL ? systemPromptProfessional : systemPromptChatty,
    },
    ...history.map((item) => ({ role: item.role, content: item.content })),
    {
      role: "user",
      content: `Tin nhắn mới: ${userMessage}\nThông tin tham khảo fallback: ${fallback}`,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: mood === AI_MOODS.PROFESSIONAL ? 0.1 : 0.25,
      messages,
    });
    const reply = completion.choices?.[0]?.message?.content?.trim() || fallback;
    return mood === AI_MOODS.PROFESSIONAL ? toProfessionalText(reply) : toFriendlyChat(reply);
  } catch (error) {
    console.error("OpenAI error:", error?.message || error);
    return fallback;
  }
};

// GPT-4 Vision: Phân tích hình ảnh y khoa
// Hỗ trợ: chụp da, X-quang, CT scan, MRI, siêu âm, mắt, vết thương
export const analyzeMedicalImage = async (imageBase64, imageType = 'general', additionalContext = '') => {
  const openai = getClient();
  
  // Phân tích cơ bản khi không có OpenAI
  const basicAnalysis = {
    skin: {
      analysis: "Hình ảnh da liễu cần được chụp rõ ràng, đủ sáng, và bao gồm toàn bộ tổn thương cùng vùng da xung quanh để đánh giá chính xác.",
      warnings: ["Không thể phân tích chi tiết. Các dấu hiệu nguy hiểm: tổn thương nhanh to, chảy máu, đau nhiều, sốt cao."],
      recommendedAction: "consult_dermatologist",
      specialty: "Da liễu",
      urgency: "medium"
    },
    xray: {
      analysis: "Hình ảnh X-quang cần có đủ thông tin về loại phim, vị trí chụp và hướng dẫn từ bác sĩ để đánh giá chính xác.",
      warnings: ["Không thể phân tích chi tiết. Nếu nghi ngờ gãy xương hoặc vấn đề nghiêm trọng, hãy đi cấp cứu."],
      recommendedAction: "consult_radiologist",
      specialty: "Chẩn đoán hình ảnh",
      urgency: "medium"
    },
    ct_mri: {
      analysis: "Hình ảnh CT/MRI cần có báo cáo từ bác sĩ chuyên khoa để đánh giá đầy đủ các phát hiện.",
      warnings: ["Không thể phân tích chi tiết. Hãy liên hệ ngay với bác sĩ nếu có triệu chứng cấp cứu."],
      recommendedAction: "consult_specialist",
      specialty: "Chẩn đoán hình ảnh",
      urgency: "high"
    },
    ultrasound: {
      analysis: "Hình ảnh siêu âm cần có kết luận từ bác sĩ siêu âm để đánh giá chính xác.",
      warnings: ["Không thể phân tích chi tiết. Hãy đi tái khám nếu có lo lắng."],
      recommendedAction: "consult_specialist",
      specialty: "Siêu âm",
      urgency: "medium"
    },
    eye: {
      analysis: "Hình ảnh mắt cần được chụp rõ nét để đánh giá võng mạc, giác mạc và thủy tinh thể.",
      warnings: ["Không thể phân tích chi tiết. Nếu giảm thị lực đột ngột, hãy đi cấp cứu."],
      recommendedAction: "consult_ophthalmologist",
      specialty: "Nhãn khoa",
      urgency: "medium"
    },
    wound: {
      analysis: "Vết thương cần được chụp rõ ràng để đánh giá kích thước, độ sâu và dấu hiệu nhiễm trùng.",
      warnings: ["Không thể phân tích chi tiết. Nếu vết thương sâu, chảy máu nhiều hoặc có dấu hiệu nhiễm trùng, hãy đi cấp cứu."],
      recommendedAction: "consult_surgeon",
      specialty: "Ngoại khoa",
      urgency: "medium"
    },
    general: {
      analysis: "Hình ảnh y khoa cần được phân tích bởi bác sĩ chuyên khoa để có kết luận chính xác.",
      warnings: ["Không thể phân tích chi tiết. Hãy đến cơ sở y tế nếu bạn có triệu chứng bất thường."],
      recommendedAction: "consult_doctor",
      specialty: null,
      urgency: "medium"
    }
  };

  const fallbackResponse = {
    success: false,
    ...basicAnalysis[imageType],
    disclaimer: "Đây chỉ là hướng dẫn cơ bản. Hãy tham khảo ý kiến bác sĩ chuyên khoa để được chẩn đoán chính xác.",
  };
  
  if (!openai) {
    console.warn("OpenAI not configured, using fallback response");
    return fallbackResponse;
  }

  // Xác định loại hình ảnh và prompt tương ứng
  const imageTypePrompts = {
    skin: {
      type: "Da liễu - Phân tích tổn thương da",
      prompt: `Bạn là bác sĩ da liễu chuyên nghiệp. Hãy phân tích hình ảnh tổn thương da và đưa ra:
1. Mô tả tổn thương (màu sắc, kích thước, hình dạng, vị trí).
2. Các bệnh có thể (chẩn đoán phân biệt).
3. Mức độ nghiêm trọng (nhẹ, trung bình, hoặc nặng).
4. Khuyến nghị (theo dõi tại nhà, đi khám chuyên khoa, hoặc đi cấp cứu).
5. Cần khám thêm những gì.`
    },
    xray: {
      type: "X-quang - Phân tích hình ảnh X-quang",
      prompt: `Bạn là bác sĩ chẩn đoán hình ảnh chuyên nghiệp. Hãy phân tích hình ảnh X-quang và đưa ra:
1. Các phát hiện bất thường (nếu có).
2. Đánh giá vùng phổi, xương, tim mạch.
3. Các dấu hiệu nghiêm trọng cần lưu ý.
4. Khuyến nghị theo dõi hoặc điều trị.`
    },
    ct_mri: {
      type: "CT/MRI - Phân tích hình ảnh cắt lớp",
      prompt: `Bạn là bác sĩ chẩn đoán hình ảnh chuyên về CT/MRI. Hãy phân tích hình ảnh và đưa ra:
1. Các phát hiện chính.
2. Đánh giá các cơ quan/vùng được chụp.
3. Các dấu hiệu cần theo dõi khẩn cấp.
4. Khuyến nghị cho bác sĩ điều trị.`
    },
    ultrasound: {
      type: "Siêu âm - Phân tích hình ảnh siêu âm",
      prompt: `Bạn là bác sĩ siêu âm chuyên nghiệp. Hãy phân tích hình ảnh siêu âm và đưa ra:
1. Đánh giá các cơ quan được khảo sát.
2. Các bất thường phát hiện được.
3. Khuyến nghị theo dõi hoặc điều trị.`
    },
    eye: {
      type: "Nhãn khoa - Phân tích hình ảnh mắt",
      prompt: `Bạn là bác sĩ nhãn khoa chuyên nghiệp. Hãy phân tích hình ảnh mắt và đưa ra:
1. Đánh giá mắt (giác mạc, võng mạc, thủy tinh thể).
2. Các dấu hiệu bệnh lý nếu có.
3. Mức độ nghiêm trọng.
4. Khuyến nghị.`
    },
    wound: {
      type: "Vết thương - Đánh giá vết thương",
      prompt: `Bạn là bác sĩ chuyên về vết thương. Hãy phân tích hình ảnh vết thương và đưa ra:
1. Mô tả vết thương (kích thước, độ sâu, màu sắc, dịch tiết).
2. Đánh giá mức độ nghiêm trọng.
3. Dấu hiệu nhiễm trùng (nếu có).
4. Khuyến nghị xử lý tại nhà hoặc cần khám.`
    },
    general: {
      type: "Khám bệnh tổng quát qua hình ảnh",
      prompt: `Bạn là bác sĩ đa khoa. Hãy phân tích hình ảnh y khoa này và đưa ra:
1. Các quan sát ban đầu.
2. Các điểm bất thường cần lưu ý.
3. Khuyến nghị (theo dõi, đi khám, hoặc cấp cứu).
4. Chuyên khoa nên khám (nếu cần).`
    }
  };

  const config = imageTypePrompts[imageType] || imageTypePrompts.general;
  
  // Build messages for GPT-4 Vision
  // Strip any existing data URL prefix from the base64 string
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  
  const messages = [
    {
      role: "system",
      content: `Bạn là trợ lý AI y khoa HealthyAI. Nhiệm vụ: ${config.prompt}

QUAN TRỌNG:
- Chỉ đưa ra PHÂN TÍCH và KHUYẾN NGHỊ, không chẩn đoán chắc chắn.
- Luôn nhắc người dùng: "Đây chỉ là phân tích sơ bộ, hãy tham khảo ý kiến bác sĩ".
- Nếu thấy dấu hiệu nguy hiểm (khó thở, đau ngực, chảy máu nặng...), KHUYẾN NGHỊ ĐI CẤP CỨU NGAY.
- Trả lời bằng tiếng Việt.
- Format JSON với các trường: analysis, warnings, recommendedAction, specialty, urgency.`
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: additionalContext ? `Thông tin bổ sung từ bệnh nhân: ${additionalContext}` : "Hãy phân tích hình ảnh y khoa này"
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${cleanBase64}`,
            detail: "low" // Low detail for faster processing
          }
        }
      ]
    }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // GPT-4o-mini - faster and cheaper
      messages,
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const response = completion.choices?.[0]?.message?.content;
    
    if (!response) {
      return fallbackResponse;
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(response);
    } catch (e) {
      // If not valid JSON, wrap it in our format
      parsed = {
        analysis: response,
        warnings: [],
        recommendedAction: "consult_doctor",
        specialty: config.type,
        urgency: "medium"
      };
    }

    return {
      success: true,
      imageType: config.type,
      ...parsed,
      disclaimer: "Đây chỉ là phân tích sơ bộ từ AI. Hãy tham khảo ý kiến bác sĩ chuyên khoa để được chẩn đoán chính xác.",
      warnings: parsed.warnings || [],
      recommendedAction: parsed.recommendedAction || "consult_doctor",
      specialty: parsed.specialty || config.type,
      urgency: parsed.urgency || "medium"
    };

  } catch (error) {
    console.error("GPT-4 Vision error:", error?.message || error);
    return fallbackResponse;
  }
};

// Phân tích nhiều hình ảnh cùng lúc
export const analyzeMultipleMedicalImages = async (images, imageType = 'general', additionalContext = '') => {
  const openai = getClient();
  
  if (!openai) {
    return {
      success: false,
      analysis: "Hệ thống AI không khả dụng. Vui lòng thử lại sau hoặc liên hệ bác sĩ trực tiếp để được tư vấn.",
      comparison: "Không thể so sánh hình ảnh",
      conclusion: "Cần hỗ trợ từ chuyên gia y tế",
      recommendedAction: "consult_doctor",
      specialty: null,
      urgency: "medium"
    };
  }

  const messages = [
    {
      role: "system",
      content: `Bạn là bác sĩ chẩn đoán hình ảnh. Hãy phân tích ${images.length} hình ảnh y khoa được gửi và đưa ra:
1. Phân tích từng hình ảnh.
2. So sánh và đánh giá tổng thể.
3. Kết luận và khuyến nghị.
4. Chuyên khoa cần khám (nếu cần).

Trả lời JSON: { analysis, comparison, conclusion, recommendedAction, specialty, urgency }.`
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: additionalContext || "Phân tích các hình ảnh y khoa này"
        },
        ...images.map(img => ({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${img}`,
            detail: "high"
          }
        }))
      ]
    }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.1,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });

    const response = completion.choices?.[0]?.message?.content;
    return response ? JSON.parse(response) : { success: false, analysis: "Không thể phân tích" };

  } catch (error) {
    console.error("Multiple images analysis error:", error);
    return { success: false, analysis: "Lỗi khi phân tích hình ảnh" };
  }
};

// Voice consultation: Chuyển giọng nói thành văn bản và phân tích
export const processVoiceConsultation = async (audioBase64, additionalContext = '') => {
  // Sử dụng Whisper để chuyển audio thành text
  // Sau đó dùng GPT để phân tích và trả lời
  
  // Hiện tại return placeholder - cần tích hợp Whisper API
  return {
    success: false,
    message: "Tính năng tư vấn giọng nói đang được phát triển",
    transcript: null,
    analysis: null
  };
};
