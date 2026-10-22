import { useMemo, useState } from 'react';
import { ArrowDown, Copy, Gift, Heart, Printer, Share2, Sparkles } from 'lucide-react';
import type { EventConfig } from '../types/index.ts';
import heroImage from '../assets/images/hero_teachers_day.jpg';
import campusImage from '../assets/images/bachkhoa_campus.jpg';
import teachersImage from '../assets/images/bachkhoa_teachers.jpg';

type EventWelcomeProps = {
  event: EventConfig | null;
  onOpenLookup: () => void;
};

const wishes = [
  (name: string, occasion: string) => `Chúc ${name} một ${occasion} thật vui, nhiều tiếng cười và ngập tràn những điều tốt đẹp. Mong mỗi ngày đến trường đều mang lại thêm niềm vui và cảm hứng mới!`,
  (name: string, occasion: string) => `Nhân ${occasion}, chúc ${name} luôn mạnh khỏe, bình an và tự tin theo đuổi những điều mình yêu thích. Chúc bạn có thật nhiều kỷ niệm đẹp bên thầy cô và bạn bè!`,
  (name: string, occasion: string) => `Gửi ${name} lời chúc ấm áp nhất nhân ${occasion}. Chúc bạn luôn rạng rỡ, gặp nhiều may mắn và có một mùa lễ đáng nhớ tại Bách Khoa Events!`,
];

function occasionLabel(occasion?: string) {
  if (!occasion) return 'ngày hội của trường';
  const normalized = occasion.toLowerCase();
  if (normalized.includes('20_10') || normalized.includes('20-10')) return 'Ngày Phụ nữ Việt Nam 20/10';
  if (normalized.includes('20_11') || normalized.includes('20-11')) return 'Ngày Nhà giáo Việt Nam 20/11';
  if (normalized.includes('08_03') || normalized.includes('8-3')) return 'Ngày Quốc tế Phụ nữ 8/3';
  if (normalized.includes('tet')) return 'dịp Tết';
  if (normalized.includes('valentine')) return 'Valentine';
  return 'ngày hội của trường';
}

export function EventWelcome({ event, onOpenLookup }: EventWelcomeProps) {
  const [recipient, setRecipient] = useState('bạn');
  const [wishIndex, setWishIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const occasion = useMemo(() => occasionLabel(event?.occasion), [event?.occasion]);
  const message = wishes[wishIndex](recipient.trim() || 'bạn', occasion);

  const scrollToWheel = () => document.getElementById('lucky-wheel')?.scrollIntoView({ behavior: 'smooth' });

  const copyWish = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const shareWish = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Lời chúc ${occasion}`, text: message });
        return;
      } catch {
        // Keep the generated wish available if the share sheet is dismissed.
      }
    }
    await copyWish();
  };

  return (
    <div className="event-home">
      <section className="welcome-hero" aria-labelledby="welcome-title">
        <img className="welcome-hero__image" src={heroImage} alt="Thầy cô và học sinh cùng đón ngày hội tại trường" />
        <div className="welcome-hero__shade" />
        <div className="welcome-hero__content">
          <p className="welcome-eyebrow"><Sparkles size={15} aria-hidden="true" /> Bách Khoa Events · Sầm Sơn</p>
          <p className="welcome-school">Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn</p>
          <h1 id="welcome-title">Cùng tạo nên<br /><span>một ngày hội đáng nhớ</span></h1>
          <p className="welcome-description">
            {event?.name || 'Gửi lời chúc chân thành, lưu giữ khoảnh khắc đẹp và tham gia vòng quay may mắn cùng thầy cô, bạn bè.'}
          </p>
          <div className="welcome-actions">
            <button type="button" className="welcome-button welcome-button--primary" onClick={scrollToWheel}>
              <Gift size={17} aria-hidden="true" /> Tham gia vòng quay
            </button>
            <button type="button" className="welcome-button welcome-button--glass" onClick={() => document.getElementById('greeting-studio')?.scrollIntoView({ behavior: 'smooth' })}>
              <Heart size={17} aria-hidden="true" /> Viết lời chúc
            </button>
          </div>
          <div className="welcome-status" aria-live="polite">
            <span className={`status-dot status-dot--${event?.status === 'ACTIVE' ? 'active' : event?.status === 'PAUSED' ? 'paused' : 'ended'}`} />
            {event?.status === 'ACTIVE' ? 'Sự kiện đang diễn ra' : event?.status === 'PAUSED' ? 'Sự kiện đang tạm dừng' : event?.status === 'ENDED' ? 'Sự kiện đã kết thúc' : 'Đang tải thông tin sự kiện'}
            {event && <span className="welcome-status__divider">·</span>}
            {event && <span>{event.totalCashRemaining} phần quà tiền mặt còn lại</span>}
          </div>
        </div>
        <div className="welcome-hero__caption"><span>Gắn kết · Tri ân · Chia sẻ</span><span>Thanh Hóa, Việt Nam</span></div>
      </section>

      <section className="campus-strip" aria-label="Khoảnh khắc tại Bách Khoa">
        <div className="campus-strip__intro">
          <span className="section-kicker">Mái trường thân thương</span>
          <h2>Mỗi dịp lễ là một<br />kỷ niệm đẹp</h2>
          <p>Cùng lưu giữ những khoảnh khắc đáng nhớ của thầy cô và học sinh Bách Khoa.</p>
          <button type="button" className="text-action" onClick={scrollToWheel}>Khám phá sự kiện <ArrowDown size={15} aria-hidden="true" /></button>
        </div>
        <figure className="campus-photo campus-photo--large">
          <img src={campusImage} alt="Khuôn viên Trường Bách Khoa trong ngày hội" loading="lazy" />
          <figcaption>Chung một mái trường, cùng viết nên kỷ niệm</figcaption>
        </figure>
        <figure className="campus-photo campus-photo--small">
          <img src={teachersImage} alt="Thầy cô và học sinh Bách Khoa" loading="lazy" />
          <figcaption>Tri ân những người truyền cảm hứng</figcaption>
        </figure>
      </section>

      <section className="greeting-studio" id="greeting-studio" aria-labelledby="greeting-title">
        <div className="greeting-studio__copy">
          <span className="section-kicker">Một lời nhắn, nhiều yêu thương</span>
          <h2 id="greeting-title">Gửi ai đó một lời chúc thật đẹp</h2>
          <p>Chọn người nhận, tạo lời chúc tiếng Việt và sao chép hoặc chia sẻ ngay. Không cần đăng nhập.</p>
          <label className="recipient-label" htmlFor="greeting-recipient">Lời chúc gửi đến</label>
          <input id="greeting-recipient" className="recipient-input" value={recipient} maxLength={60} onChange={(e) => setRecipient(e.target.value)} placeholder="Tên người nhận hoặc cách xưng hô" />
          <button type="button" className="text-action greeting-refresh" onClick={() => setWishIndex((wishIndex + 1) % wishes.length)}>
            <Sparkles size={15} aria-hidden="true" /> Tạo lời chúc khác
          </button>
        </div>
        <article className="wish-card" aria-live="polite">
          <div className="wish-card__ornament" aria-hidden="true">✿</div>
          <span className="wish-card__label">Thân gửi {recipient.trim() || 'bạn'}</span>
          <p>{message}</p>
          <span className="wish-card__signature">Thương mến, Bách Khoa Events</span>
          <div className="wish-card__actions">
            <button type="button" onClick={copyWish}><Copy size={15} aria-hidden="true" /> {copied ? 'Đã sao chép' : 'Sao chép lời chúc'}</button>
            <button type="button" onClick={shareWish}><Share2 size={15} aria-hidden="true" /> Chia sẻ</button>
            <button type="button" onClick={() => window.print()}><Printer size={15} aria-hidden="true" /> Lưu / in thiệp</button>
          </div>
          {copied && <span className="sr-only" role="status">Đã sao chép lời chúc vào bộ nhớ tạm.</span>}
        </article>
      </section>

      <div className="event-home__lookup">
        <div><span className="section-kicker">Đã có mã nhận thưởng?</span><p>Tra cứu tiến độ nhận quà bằng mã claim của bạn.</p></div>
        <button type="button" className="welcome-button welcome-button--primary" onClick={onOpenLookup}>Tra cứu giải thưởng <ArrowDown size={15} aria-hidden="true" /></button>
      </div>
    </div>
  );
}
