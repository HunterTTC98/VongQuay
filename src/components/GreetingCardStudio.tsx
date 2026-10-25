import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Heart,
  Sparkles,
  Download,
  Copy,
  Share2,
  Check,
  RefreshCw,
  Palette,
  Users,
  Feather,
  Printer,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { PRESET_OCCASIONS } from '../types/index.ts';

interface GreetingCardStudioProps {
  currentOccasionId?: string;
  onCardGenerated?: (cardData: any) => void;
}

// Target recipients
const RECIPIENTS = [
  { id: 'TEACHER', label: 'Thầy Cô giáo', icon: '👨‍🏫' },
  { id: 'FRIEND', label: 'Bạn bè / Lớp', icon: '🎒' },
  { id: 'WOMEN', label: 'Mẹ & Phái đẹp', icon: '💐' },
  { id: 'SCHOOL', label: 'Mái trường BK', icon: '🏫' },
  { id: 'CRUSH', label: 'Người thương', icon: '💌' },
];

// Aesthetic Card Design Styles
const CARD_THEMES = [
  {
    id: 'TRADITIONAL_RED',
    name: 'Son Vàng Truyền Thống',
    bgGradient: 'from-red-800 via-red-700 to-amber-900',
    canvasBgStart: '#881337',
    canvasBgEnd: '#4c0519',
    borderColor: '#fde047',
    textColor: '#ffffff',
    accentColor: '#fef08a',
    sealText: 'TRI ÂN',
  },
  {
    id: 'NAVY_BACHKHOA',
    name: 'Bách Khoa Sầm Sơn',
    bgGradient: 'from-slate-900 via-blue-950 to-indigo-950',
    canvasBgStart: '#0f172a',
    canvasBgEnd: '#1e1b4b',
    borderColor: '#38bdf8',
    textColor: '#ffffff',
    accentColor: '#bae6fd',
    sealText: 'BÁCH KHOA',
  },
  {
    id: 'ELEGANT_ROSE',
    name: 'Hoa Hồng Nhã Nhặn',
    bgGradient: 'from-rose-900 via-pink-900 to-amber-950',
    canvasBgStart: '#4c0519',
    canvasBgEnd: '#831843',
    borderColor: '#fbcfe8',
    textColor: '#ffffff',
    accentColor: '#fce7f3',
    sealText: 'YÊU THƯƠNG',
  },
  {
    id: 'YOUTH_GREEN',
    name: 'Thanh Niên Khát Vọng',
    bgGradient: 'from-emerald-900 via-teal-900 to-cyan-950',
    canvasBgStart: '#064e3b',
    canvasBgEnd: '#134e4a',
    borderColor: '#6ee7b7',
    textColor: '#ffffff',
    accentColor: '#a7f3d0',
    sealText: 'NHIỆT HUYẾT',
  },
  {
    id: 'GOLDEN_FESTIVAL',
    name: 'Hoàng Kim Lễ Hội',
    bgGradient: 'from-amber-950 via-yellow-950 to-stone-900',
    canvasBgStart: '#451a03',
    canvasBgEnd: '#292524',
    borderColor: '#f59e0b',
    textColor: '#ffffff',
    accentColor: '#fef3c7',
    sealText: 'CHÚC MỪNG',
  },
];

// Rich Curated Vietnamese Wishes by Occasion and Recipient
const CURATED_WISHES: Record<string, Record<string, string[]>> = {
  '20_11': {
    TEACHER: [
      'Kính chúc Thầy/Cô luôn dồi dào sức khỏe, tràn đầy nhiệt huyết và niềm vui trên bục giảng để tiếp tục chắp cánh cho bao thế hệ học trò Bách Khoa.',
      'Cảm ơn Thầy/Cô vì sự tận tâm, bao dung và những bài học quý giá không chỉ trong sách vở mà cả trong cuộc sống.',
      'Nhân ngày Nhà giáo Việt Nam 20/11, kính chúc Thầy/Cô một mùa hiến chương rực rỡ, hạnh phúc và vạn sự như ý.',
    ],
    FRIEND: [
      'Chúc người bạn đồng hành cùng bàn một mùa lễ 20/11 thật vui, học tập tiến bộ và gặt hái thật nhiều điểm 9, 10 nhé!',
      'Gửi lời chúc ấm áp tới toàn thể tập thể lớp, cùng nhau nỗ lực học tập để thầy cô luôn tự hào về chúng mình!',
    ],
    SCHOOL: [
      'Tự hào là học sinh Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn. Kính chúc nhà trường ngày càng phát triển vững mạnh!',
    ],
  },
  '20_10': {
    WOMEN: [
      'Kính chúc Cô giáo và các bạn nữ một ngày 20/10 thật nhiều hoa, ngập tràn nụ cười, luôn tự tin và tỏa sáng!',
      'Gửi trọn tình cảm và lòng biết ơn sâu sắc đến người phụ nữ tuyệt vời nhất. Chúc mẹ luôn bình an, mạnh khỏe và hạnh phúc.',
      'Chúc phái đẹp Bách Khoa Events luôn rạng ngời, duyên dáng và thành công trên mọi nẻo đường tương lai!',
    ],
    FRIEND: [
      'Chúc bạn nữ của lớp luôn rạng rỡ như hoa, tự tin chinh phục mọi ước mơ và có một ngày 20/10 thật ngọt ngào!',
    ],
    TEACHER: [
      'Kính chúc Cô giáo một ngày 20/10 thật nhiều niềm vui, luôn trẻ trung, hạnh phúc và thành công trong sự nghiệp trồng người.',
    ],
  },
  '8_3': {
    WOMEN: [
      'Nhân ngày Quốc tế Phụ nữ 8/3, chúc Cô và các bạn nữ luôn xinh đẹp, hạnh phúc và đón nhận muôn vàn yêu thương!',
      'Chúc một nửa thế giới tại Bách Khoa Sầm Sơn luôn rạng rỡ nụ cười, vững bước trên con đường tri thức và thành công.',
    ],
    TEACHER: [
      'Kính chúc Cô giáo ngày 8/3 ngập tràn hoa tươi, sức khỏe dồi dào và luôn giữ mãi ngọn lửa đam mê truyền thụ kiến thức.',
    ],
  },
  TET: {
    TEACHER: [
      'Kính chúc Thầy/Cô năm mới An Khang Thịnh Vượng, Vạn Sự Như Ý, dồi dào sức khỏe và luôn an vui bên gia đình.',
    ],
    FRIEND: [
      'Năm mới chúc bạn học siêu đỉnh, may mắn ngập tràn, vạn sự hanh thông và rinh thật nhiều quà xuân nhé!',
    ],
    SCHOOL: [
      'Mừng xuân mới Bách Khoa Events! Kính chúc trường ta năm mới gặt hái thêm nhiều thành tựu giáo dục rực rỡ.',
    ],
  },
  THANH_LAP: {
    SCHOOL: [
      'Nhiệt liệt chúc mừng Ngày thành lập Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn! Mãi tự hào mái trường thân yêu!',
      'Kính chúc Trường ngày càng phát triển, đào tạo thêm nhiều thế hệ kỹ thuật viên, nhân lực tay nghề cao cống hiến cho đất nước.',
    ],
    TEACHER: [
      'Kính chúc các Thầy Cô lãnh đạo và cán bộ giáo viên nhà trường luôn tràn đầy nhiệt huyết xây dựng trường ngày càng vững mạnh.',
    ],
  },
  VALENTINE: {
    CRUSH: [
      'Gặp được bạn dưới mái trường Bách Khoa là điều tuyệt vời nhất của thanh xuân. Chúc bạn một mùa Valentine thật ấm áp!',
      'Gửi đến người đặc biệt lời chúc ngọt ngào nhất. Mong mỗi ngày trôi qua đều có nụ cười rạng rỡ của bạn bên cạnh.',
    ],
    FRIEND: [
      'Valentine chúc hội bạn thân luôn yêu đời, vui tươi và sớm tìm được một nửa yêu thương của đời mình nhé!',
    ],
  },
  '26_3': {
    FRIEND: [
      'Chào mừng Ngày thành lập Đoàn TNCS Hồ Chí Minh 26/3! Chúc tuổi trẻ Bách Khoa luôn rực cháy ngọn lửa nhiệt huyết, năng động và sáng tạo!',
      'Thanh niên Bách Khoa Sầm Sơn: Tiên phong - Bản lĩnh - Đoàn kết - Phát triển!',
    ],
    SCHOOL: [
      'Tự hào tuổi trẻ Trường Bách Khoa Sầm Sơn! Chúc các phong trào Đoàn trường luôn sôi nổi và gặt hái nhiều bằng khen xuất sắc.',
    ],
  },
  HOI_TRUONG: {
    SCHOOL: [
      'Chúc ngày hội trường Bách Khoa Events diễn ra thành công rực rỡ, thắt chặt tinh thần đoàn kết thầy trò và học sinh!',
      'Chào đón ngày hội với trọn vẹn niềm vui, những kỷ niệm đẹp và thật nhiều phần quà may mắn!',
    ],
  },
};

// Curated 100% Vietnamese Error-Free Fonts
export const VIETNAMESE_FONTS = [
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif", desc: 'Hiện đại, đậm nét' },
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif", desc: 'Sắc nét, chuẩn Web' },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', Georgia, serif", desc: 'Thanh lịch, nghệ thuật' },
  { id: 'roboto', name: 'Roboto', family: "'Roboto', sans-serif", desc: 'Mượt mà, dễ nhìn' },
];

export const GreetingCardStudio: React.FC<GreetingCardStudioProps> = ({
  currentOccasionId = '20_11',
}) => {
  const [selectedOccasion, setSelectedOccasion] = useState(currentOccasionId);
  const [selectedRecipient, setSelectedRecipient] = useState('TEACHER');
  const [selectedThemeId, setSelectedThemeId] = useState('TRADITIONAL_RED');
  const [selectedFontId, setSelectedFontId] = useState('montserrat');
  const [recipientName, setRecipientName] = useState('Thầy Cô kính yêu');
  const [senderName, setSenderName] = useState('Học sinh Bách Khoa Sầm Sơn');
  const [customWish, setCustomWish] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active theme object
  const activeTheme = useMemo(
    () => CARD_THEMES.find((t) => t.id === selectedThemeId) || CARD_THEMES[0],
    [selectedThemeId]
  );

  // Active font object
  const activeFont = useMemo(
    () => VIETNAMESE_FONTS.find((f) => f.id === selectedFontId) || VIETNAMESE_FONTS[0],
    [selectedFontId]
  );

  // Active occasion object
  const activeOccasion = useMemo(
    () => PRESET_OCCASIONS.find((o) => o.id === selectedOccasion) || PRESET_OCCASIONS[0],
    [selectedOccasion]
  );

  // Suggested wishes list for current filter
  const currentWishList = useMemo(() => {
    const byOccasion = CURATED_WISHES[selectedOccasion] || CURATED_WISHES['20_11'];
    const byRecip = byOccasion[selectedRecipient] || byOccasion['TEACHER'] || [
      `Chúc ${recipientName} một ngày lễ tràn đầy niềm vui, hạnh phúc và thành công tại Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn!`,
    ];
    return byRecip;
  }, [selectedOccasion, selectedRecipient, recipientName]);

  // Set default wish on filter change
  useEffect(() => {
    if (currentWishList.length > 0 && !customWish) {
      setCustomWish(currentWishList[0]);
    }
  }, [currentWishList]);

  // Draw Card onto HTML5 Canvas
  const renderCardToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1000;
    const height = 660;
    canvas.width = width;
    canvas.height = height;

    // 1. Velvet Multi-Stop Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, activeTheme.canvasBgStart);
    bgGrad.addColorStop(0.55, activeTheme.canvasBgEnd);
    bgGrad.addColorStop(1, '#0c070e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Central Ambient Radial Glow
    const glow = ctx.createRadialGradient(width / 2, height / 2 - 30, 20, width / 2, height / 2 - 30, 480);
    glow.addColorStop(0, 'rgba(251, 191, 36, 0.16)');
    glow.addColorStop(0.5, 'rgba(244, 114, 182, 0.08)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // 3. Floating Bokeh Dust Particles (Deterministic positions for stability)
    const bokehStars = [
      { x: 90, y: 120, r: 2.5, a: 0.6 },
      { x: 180, y: 90, r: 1.5, a: 0.4 },
      { x: 880, y: 130, r: 3, a: 0.5 },
      { x: 920, y: 220, r: 1.8, a: 0.4 },
      { x: 140, y: 520, r: 2, a: 0.45 },
      { x: 840, y: 490, r: 2.2, a: 0.5 },
      { x: 500, y: 70, r: 1.5, a: 0.35 },
    ];
    for (const b of bokehStars) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(253, 230, 138, ${b.a})`;
      ctx.fill();
    }

    // 4. Luxury Double Gold Foil Borders
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = activeTheme.borderColor;
    ctx.strokeRect(26, 26, width - 52, height - 52);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.strokeRect(36, 36, width - 72, height - 72);

    // Modern Geometric Corner Brackets
    const drawModernCorner = (x: number, y: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = activeTheme.borderColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(28, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 28);
      ctx.stroke();

      // Corner diamond dot
      ctx.beginPath();
      ctx.arc(10, 10, 3, 0, Math.PI * 2);
      ctx.fillStyle = activeTheme.borderColor;
      ctx.fill();
      ctx.restore();
    };

    drawModernCorner(46, 46, 0);
    drawModernCorner(width - 46, 46, Math.PI / 2);
    drawModernCorner(width - 46, height - 46, Math.PI);
    drawModernCorner(46, height - 46, -Math.PI / 2);

    // 5. Header: School Crest Tag
    ctx.textAlign = 'center';
    ctx.fillStyle = activeTheme.accentColor;
    ctx.font = '800 13px "Montserrat", Arial, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('TRƯỜNG TC CÔNG NGHIỆP BÁCH KHOA SẦM SƠN', width / 2, 74);

    ctx.font = '600 11px "Inter", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.letterSpacing = '2px';
    ctx.fillText('BÁCH KHOA EVENTS · THIỆP ĐIỆN TỬ TRI ÂN', width / 2, 94);

    // 6. Occasion Badge Pill (Modern luxury style)
    const occasionText = `✦ MỪNG ${activeOccasion.name.toUpperCase()} ✦`;
    ctx.font = '800 15px "Montserrat", Arial, sans-serif';
    const pillWidth = Math.max(280, ctx.measureText(occasionText).width + 50);
    const pillHeight = 36;
    const pillX = width / 2 - pillWidth / 2;
    const pillY = 120;

    // Draw frosted pill
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 18);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = activeTheme.borderColor;
    ctx.stroke();

    ctx.fillStyle = activeTheme.accentColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(occasionText, width / 2, pillY + pillHeight / 2);
    ctx.restore();

    // 7. Watermark Quotation Mark behind wish text
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '900 150px "Playfair Display", Georgia, serif';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
    ctx.fillText('“', 110, 180);
    ctx.restore();

    // 8. Recipient Greeting
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 700 24px "Playfair Display", Georgia, serif';
    ctx.fillText(`Kính gửi: ${recipientName.trim() || 'Bạn thương mến'}`, width / 2, 215);

    // Subtle divider
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, 235);
    ctx.lineTo(width / 2 + 80, 235);
    ctx.strokeStyle = activeTheme.borderColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 9. Wish Body (Formatted with user-chosen Vietnamese font)
    const wishText = customWish || currentWishList[0] || 'Chúc bạn một ngày lễ ngập tràn niềm vui!';
    ctx.fillStyle = '#f8fafc';
    ctx.font = `500 20px ${activeFont.family}`;
    ctx.letterSpacing = '0.3px';

    const maxTextWidth = 720;
    const lineHeight = 35;
    const words = wishText.split(' ');
    let currentLine = '';
    const lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && n > 0) {
        lines.push(currentLine);
        currentLine = words[n] + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    const startY = 275;
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      ctx.fillText(lines[i].trim(), width / 2, startY + i * lineHeight);
    }

    // 10. Sender Signature Box (Bottom Right)
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '600 13px "Inter", Arial, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('NGƯỜI GỬI THÂN TÌNH', width - 90, height - 128);

    ctx.fillStyle = activeTheme.accentColor;
    ctx.font = '700 21px "Playfair Display", Georgia, serif';
    ctx.fillText(senderName.trim() || 'Học sinh Bách Khoa Sầm Sơn', width - 90, height - 100);

    // 11. Red Lacquer Traditional Seal Stamp (Bottom Left)
    const sealX = 120;
    const sealY = height - 110;
    ctx.save();

    // Outer gold ring
    ctx.beginPath();
    ctx.arc(sealX, sealY, 34, 0, Math.PI * 2);
    ctx.strokeStyle = activeTheme.borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner crimson wax circle
    ctx.beginPath();
    ctx.arc(sealX, sealY, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 11px "Montserrat", Arial, sans-serif';
    ctx.fillText(activeTheme.sealText, sealX, sealY - 7);
    ctx.font = '700 8px "Montserrat", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BÁCH KHOA', sealX, sealY + 8);
    ctx.restore();
  };

  useEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        renderCardToCanvas();
      });
    } else {
      renderCardToCanvas();
    }
  }, [
    selectedOccasion,
    selectedRecipient,
    selectedThemeId,
    selectedFontId,
    recipientName,
    senderName,
    customWish,
    activeTheme,
    activeFont,
    activeOccasion,
  ]);

  // Download Card as high-res PNG image
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);

    try {
      const link = document.createElement('a');
      const filename = `Thiep_${selectedOccasion}_BachKhoaEvents_${Date.now()}.png`;
      link.download = filename;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error('Error downloading card image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy wish message to clipboard
  const handleCopyWish = async () => {
    const textToCopy = `${customWish}\n\n— Thân gửi từ ${senderName || 'Bách Khoa Events'} (Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn)`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  // Native share if supported
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Thiệp mừng ${activeOccasion.name} · Bách Khoa Events`,
          text: `${customWish}\n\nThân gửi ${recipientName} từ ${senderName}`,
        });
      } catch {
        // ignore dismiss
      }
    } else {
      handleCopyWish();
    }
  };

  return (
    <section
      id="greeting-card-studio"
      className="scroll-mt-20 my-10 bg-white rounded-3xl shadow-xl border border-rose-200/80 p-5 sm:p-8 max-w-6xl mx-auto"
      aria-label="Studio tạo thiệp điện tử và lời chúc tiếng Việt"
    >
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-extrabold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Giai Đoạn 2 · Bách Khoa Events</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight font-serif">
            Tạo Thiệp Điện Tử & Lời Chúc Tiếng Việt
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Thiết kế thiệp nghệ thuật theo từng dịp lễ của trường, tải ảnh PNG sắc nét hoặc sao chép lời chúc gửi Thầy Cô và bạn bè.
          </p>
        </div>

        {/* Occasion Selector Pill with Mobile Overflow Protection */}
        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
          <label htmlFor="card-occasion-select" className="text-xs font-bold text-gray-700 whitespace-nowrap shrink-0">
            Dịp lễ:
          </label>
          <div className="relative w-full sm:w-auto min-w-0 max-w-full">
            <select
              id="card-occasion-select"
              value={selectedOccasion}
              onChange={(e) => {
                setSelectedOccasion(e.target.value);
                setCustomWish('');
              }}
              className="w-full sm:w-auto max-w-full sm:max-w-xs truncate px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm cursor-pointer"
            >
              {PRESET_OCCASIONS.map((occ) => (
                <option key={occ.id} value={occ.id} className="text-gray-900 bg-white">
                  {occ.shortLabel} · {occ.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customization Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Recipient Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              1. Người nhận thiệp:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {RECIPIENTS.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => {
                    setSelectedRecipient(rec.id);
                    if (rec.id === 'TEACHER') setRecipientName('Thầy Cô kính yêu');
                    else if (rec.id === 'FRIEND') setRecipientName('Bạn thân mến');
                    else if (rec.id === 'WOMEN') setRecipientName('Mẹ / Bạn nữ yêu quý');
                    else if (rec.id === 'SCHOOL') setRecipientName('Mái trường Bách Khoa');
                    else if (rec.id === 'CRUSH') setRecipientName('Người thương');
                    setCustomWish('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedRecipient === rec.id
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <span>{rec.icon}</span>
                  <span>{rec.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient and Sender Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tên / Danh xưng nhận:
              </label>
              <input
                type="text"
                value={recipientName}
                maxLength={45}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="VD: Thầy Nguyễn Văn A..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Ký tên người gửi:
              </label>
              <input
                type="text"
                value={senderName}
                maxLength={45}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="VD: Tập thể Lớp K15..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Theme Palette Chooser */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              2. Phong cách mỹ thuật:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CARD_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedThemeId(theme.id)}
                  className={`p-2.5 rounded-xl text-left border transition relative overflow-hidden ${
                    selectedThemeId === theme.id
                      ? 'border-rose-600 ring-2 ring-rose-500/40 bg-rose-50/50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div
                    className={`h-4 w-full rounded-md bg-gradient-to-r ${theme.bgGradient} mb-1.5`}
                  />
                  <span className="text-[11px] font-bold text-gray-900 block truncate">
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Vietnamese Typography Font Chooser */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                3. Font chữ tiếng Việt chuẩn:
              </label>
              <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ 100% Không lỗi dấu
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {VIETNAMESE_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => setSelectedFontId(font.id)}
                  className={`p-2.5 rounded-xl text-left border transition ${
                    selectedFontId === font.id
                      ? 'border-rose-600 ring-2 ring-rose-500/40 bg-rose-50/70 text-rose-950 font-bold'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{font.name}</span>
                    {selectedFontId === font.id && <span className="text-rose-600 text-xs">●</span>}
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5">{font.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Curated Wish List & Edit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                4. Lời chúc tiếng Việt:
              </label>
              <button
                type="button"
                onClick={() => {
                  const others = currentWishList.filter((w) => w !== customWish);
                  if (others.length > 0) {
                    setCustomWish(others[Math.floor(Math.random() * others.length)]);
                  }
                }}
                className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Đổi lời chúc khác</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={customWish}
              onChange={(e) => setCustomWish(e.target.value)}
              placeholder="Nhập hoặc chỉnh sửa lời chúc gửi đến người nhận..."
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
            />

            {/* Quick Pick Pills */}
            <div className="mt-2 space-y-1.5">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">
                Gợi ý lời chúc hay:
              </span>
              {currentWishList.map((wish, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomWish(wish)}
                  className={`w-full text-left p-2 rounded-lg text-xs leading-normal transition border ${
                    customWish === wish
                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600'
                  }`}
                >
                  {wish}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Card Canvas & Actions (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Xem trước thiệp điện tử thực tế
            </span>
            <span className="text-[11px] text-gray-400">Độ phân giải cao (1000 × 660px)</span>
          </div>

          {/* Canvas Wrapper with drop-shadow and golden border */}
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-300/80 bg-stone-900 aspect-[1000/660] relative">
            <canvas ref={canvasRef} className="w-full h-full block object-contain" />
          </div>

          {/* Card Actions Button Bar */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
            {/* Download PNG */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-red-500/20 transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang xuất thiệp...' : 'Tải Thiệp Về Máy (PNG)'}</span>
            </button>

            {/* Copy Wish Text */}
            <button
              type="button"
              onClick={handleCopyWish}
              className="py-3 px-4 rounded-xl bg-gray-900 hover:bg-black active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-300" />}
              <span>{copied ? 'Đã sao chép!' : 'Sao Chép Lời Chúc'}</span>
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 active:scale-95 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 text-rose-600" />
              <span>Chia Sẻ Thiệp</span>
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center mt-3">
            Mẹo: Bạn có thể lưu thiệp gửi qua Zalo, Messenger, Facebook hoặc in ra làm quà tặng thầy cô và bạn bè.
          </p>
        </div>
      </div>
    </section>
  );
};
