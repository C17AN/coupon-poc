import type { PanInfo } from "motion";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import "./CouponBoard.css";

export interface Coupon {
  id: number;
  label: string;
  color: string;
}

const colors = ["#ef5350", "#ff7043", "#26a69a", "#ffa726", "#ab47bc"];
const labels = ["100점", "200점", "300점"];

const initialCoupons: Coupon[] = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1;
  return {
    id,
    label: labels[i % labels.length],
    color: colors[i % colors.length],
  } as Coupon;
});

const SLOT_COUNT = 5;

export default function CouponBoard() {
  const [slots, setSlots] = useState<Array<Coupon | null>>(
    Array(SLOT_COUNT).fill(null)
  );
  const [available, setAvailable] = useState<Coupon[]>(initialCoupons);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);

  // 각 슬롯 DOM 을 기억해서 드랍 영역 체크
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const reset = () => {
    setSlots(Array(SLOT_COUNT).fill(null));
    setAvailable(initialCoupons);
  };

  const allFilled = slots.every(Boolean);

  const tryPlaceCoupon = (couponId: number, pageX: number, pageY: number) => {
    const coupon = available.find((c) => c.id === couponId);
    if (!coupon) return;

    for (let i = 0; i < SLOT_COUNT; i++) {
      const slotEl = slotRefs.current[i];
      if (!slotEl || slots[i]) continue;
      const rect = slotEl.getBoundingClientRect();
      if (
        pageX >= rect.left &&
        pageX <= rect.right &&
        pageY >= rect.top &&
        pageY <= rect.bottom
      ) {
        const newSlots = [...slots];
        newSlots[i] = coupon;
        setSlots(newSlots);
        setAvailable((prev) => prev.filter((c) => c.id !== couponId));
        break;
      }
    }
  };

  const getSlotIndexAt = (pageX: number, pageY: number): number | null => {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const el = slotRefs.current[i];
      if (!el || slots[i]) continue;
      const rect = el.getBoundingClientRect();
      if (
        pageX >= rect.left &&
        pageX <= rect.right &&
        pageY >= rect.top &&
        pageY <= rect.bottom
      ) {
        return i;
      }
    }
    return null;
  };

  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="coupon-container" ref={containerRef}>
      <h2>OK캐쉬백 쿠폰 모음판</h2>
      <div className="board">
        {slots.map((slot, idx) => (
          <div
            key={idx}
            className={`slot ${hoverSlot === idx && !slot ? "slot-hover" : ""}`}
            ref={(el) => (slotRefs.current[idx] = el)}
          >
            <AnimatePresence>
              {slot ? (
                <motion.div
                  className="coupon"
                  style={{ backgroundColor: slot.color }}
                  layout
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    transition: { type: "spring", bounce: 0.2, duration: 0.4 },
                  }}
                  exit={{
                    scale: 0.8,
                    opacity: 0,
                    transition: { duration: 0.2 },
                  }}
                >
                  {slot.label}
                </motion.div>
              ) : (
                <motion.span
                  className="placeholder"
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 0.7 }}
                >
                  +
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <h3>사용 가능한 쿠폰</h3>
      <div className="available-scroll">
        <div className="available-list">
          <AnimatePresence>
            {available.map((coupon) => (
              <motion.div
                key={coupon.id}
                className="coupon"
                style={{ backgroundColor: coupon.color }}
                drag
                dragMomentum={false}
                dragSnapToOrigin
                dragConstraints={containerRef}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onDrag={(_e, info: PanInfo) => {
                  const idx = getSlotIndexAt(info.point.x, info.point.y);
                  setHoverSlot(idx);
                }}
                onDragEnd={(_e, info: PanInfo) => {
                  tryPlaceCoupon(coupon.id, info.point.x, info.point.y);
                  setHoverSlot(null);
                }}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {coupon.label}
              </motion.div>
            ))}
          </AnimatePresence>
          {available.length === 0 && <p>모든 쿠폰을 사용했습니다.</p>}
        </div>
      </div>

      {allFilled && (
        <motion.div
          className="complete-msg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          💰 모든 쿠폰을 모았습니다! 포인트가 적립되었습니다!
        </motion.div>
      )}

      <button className="reset-btn" onClick={reset}>
        초기화
      </button>
    </div>
  );
}
