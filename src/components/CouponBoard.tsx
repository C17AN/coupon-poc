import JsBarcode from "jsbarcode";
import type { PanInfo } from "motion";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./CouponBoard.css";
import Modal from "./Modal";

export interface Coupon {
  id: number;
  label: string; // point value
  partner: string; // 제휴사
  color: string; // color derived from partner
}

const partners = ["A 편의점", "B 편의점", "A 마트", "B 마트", "B 카페"];

const partnerColors: Record<string, string> = {
  "A 편의점": "#ef5350", // red
  "B 편의점": "#ff7043", // orange
  "A 마트": "#26a69a", // teal
  "B 마트": "#ffa726", // amber
  "B 카페": "#ab47bc", // purple
};

const labels = ["100점", "200점", "300점"];

const initialCoupons: Coupon[] = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1;
  const partner = partners[i % partners.length];
  return {
    id,
    label: labels[i % labels.length],
    partner,
    color: partnerColors[partner],
  } as Coupon;
});

const SLOT_COUNT = 5;

export default function CouponBoard() {
  const [slots, setSlots] = useState<Array<Coupon | null>>(
    Array(SLOT_COUNT).fill(null)
  );
  const [available, setAvailable] = useState<Coupon[]>(initialCoupons);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    coupon: Coupon;
    x: number;
    y: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [partnerFilter, setPartnerFilter] = useState<string>("ALL");
  const [barcode, setBarcode] = useState<string | null>(null);
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 각 슬롯 DOM 을 기억해서 드랍 영역 체크
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const reset = () => {
    setSlots(Array(SLOT_COUNT).fill(null));
    setAvailable(initialCoupons);
  };

  const samePartnerFilled =
    slots.every(Boolean) && new Set(slots.map((c) => c!.partner)).size === 1;

  // 슬롯 포인트 합산 ("100점" → 100)
  const sumOfPoints = slots.reduce((sum, c) => {
    if (!c) return sum;
    const num = parseInt(c.label.replace(/[^0-9]/g, ""), 10);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const tryPlaceCoupon = (couponId: number, pageX: number, pageY: number) => {
    // 이미 바코드가 발급된 뒤에는 추가 배치를 막음
    if (barcode) return;

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

  // 헬퍼: 현재 보드에 배치된 파트너 집합
  const placedPartners = new Set(slots.filter(Boolean).map((c) => c!.partner));

  // 슬롯에 하나라도 쿠폰이 있는지 여부 (필터 버튼 disabled 처리에 사용)
  const anyPlaced = slots.some(Boolean);

  // 보여줄 쿠폰 목록
  const filteredAvailable = available.filter((c) => {
    const matchesFilter =
      partnerFilter === "ALL" || c.partner === partnerFilter;
    const matchesPlaced =
      placedPartners.size === 0 || placedPartners.has(c.partner);
    return matchesFilter && matchesPlaced;
  });

  // 바코드 렌더링
  useEffect(() => {
    if (barcode && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, barcode, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 60,
          displayValue: false,
          margin: 0,
        });
      } catch (e) {
        console.error("JsBarcode error", e);
      }
    }
  }, [barcode]);

  return (
    <div className="coupon-container" ref={containerRef}>
      <h2>캐쉬백 쿠폰 모음판</h2>
      <div className="board">
        {slots.map((slot, idx) => (
          <div
            key={idx}
            className={`slot ${slot ? "slot-filled" : ""} ${
              hoverSlot === idx && !slot ? "slot-hover" : ""
            }`}
            ref={(el) => (slotRefs.current[idx] = el)}
          >
            <AnimatePresence>
              {slot ? (
                <motion.div
                  className="coupon"
                  style={{ backgroundColor: slot.color }}
                  layout
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    transition: {
                      type: "tween",
                      ease: "easeInOut",
                      duration: 0.3,
                    },
                  }}
                  exit={{
                    scale: 0.8,
                    opacity: 0,
                    transition: { duration: 0.2 },
                  }}
                  onClick={() => {
                    if (barcode) return; // 바코드 발급 후에는 해제 불가
                    // remove from slot
                    const newSlots = [...slots];
                    newSlots[idx] = null;
                    setSlots(newSlots);
                    setAvailable((prev) => [...prev, slot]);
                  }}
                >
                  <div className="coupon-label">{slot.label}</div>
                  <div className="coupon-partner">{slot.partner}</div>
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

      {/* 파트너 필터 버튼 (제목 바로 아래) */}
      <div className="partner-filter">
        <button
          className={`filter-btn all-btn ${
            partnerFilter === "ALL" ? "active" : ""
          }`}
          onClick={() => setPartnerFilter("ALL")}
          disabled={anyPlaced}
        >
          전체
        </button>
        {partners.map((p) => (
          <button
            key={p}
            className={`filter-btn ${partnerFilter === p ? "active" : ""}`}
            onClick={() => setPartnerFilter(p)}
            style={{ backgroundColor: partnerColors[p] }}
            disabled={anyPlaced}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="available-scroll">
        {!barcode ? (
          <div className="available-list">
            <AnimatePresence>
              {filteredAvailable.map((coupon) => (
                <motion.div
                  key={coupon.id}
                  className={`coupon ${
                    draggingId === coupon.id ? "drag-hidden" : ""
                  }`}
                  style={{ backgroundColor: coupon.color }}
                  drag
                  dragMomentum={false}
                  dragSnapToOrigin
                  dragConstraints={containerRef}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  whileDrag={{ opacity: 0 }}
                  onPointerDown={() => setDraggingId(coupon.id)}
                  onDragStart={(_e, info: PanInfo) => {
                    setDragPreview({
                      coupon,
                      x: info.point.x,
                      y: info.point.y,
                    });
                  }}
                  onDrag={(_e, info: PanInfo) => {
                    const idx = getSlotIndexAt(info.point.x, info.point.y);
                    setHoverSlot(idx);
                    setDragPreview((prev) =>
                      prev && prev.coupon.id === coupon.id
                        ? { ...prev, x: info.point.x, y: info.point.y }
                        : prev
                    );
                  }}
                  onDragEnd={(_e, info: PanInfo) => {
                    tryPlaceCoupon(coupon.id, info.point.x, info.point.y);
                    setHoverSlot(null);
                    setDragPreview(null);
                    setDraggingId(null);
                  }}
                  layout
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 40,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="coupon-label">{coupon.label}</div>
                  <div className="coupon-partner">{coupon.partner}</div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredAvailable.length === 0 && <p>모든 쿠폰을 사용했습니다.</p>}
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              key="barcode-box"
              className="barcode-container"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <svg ref={barcodeRef}></svg>
              <p>{barcode}</p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* 완료 모달 (Custom) */}
      <Modal open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <h2 className="dialog-title">할인 쿠폰이 생성되었어요!</h2>
        <p className="dialog-description">바코드를 확인해 주세요.</p>
        <button
          className="reset-btn"
          style={{ marginTop: "16px" }}
          onClick={() => setDialogOpen(false)}
        >
          확인
        </button>
      </Modal>

      <div
        style={{
          display: "flex",
          gap: "8px",
          justifyContent: "center",
          marginTop: "16px",
        }}
      >
        <button className="reset-btn" onClick={reset}>
          초기화
        </button>
        {samePartnerFilled && !barcode && (
          <button
            className="receive-btn"
            onClick={() => {
              const rand = Array.from({ length: 20 }, () =>
                Math.floor(Math.random() * 10)
              ).join("");
              setBarcode(rand);
              setDialogOpen(true);
            }}
          >
            {sumOfPoints}점 할인 쿠폰 받기
          </button>
        )}
        {barcode && (
          <button
            className="go-coupon-btn"
            onClick={() => alert("쿠폰함으로 이동")}
          >
            내 쿠폰함 바로가기
          </button>
        )}
      </div>

      {dragPreview &&
        createPortal(
          <motion.div
            className="coupon"
            style={{
              backgroundColor: dragPreview.coupon.color,
              position: "fixed",
              top: dragPreview.y - 59 /* center offset */,
              left: dragPreview.x - 36,
              zIndex: 9999,
              pointerEvents: "none",
            }}
            initial={false}
            animate={{ scale: 1 }}
          >
            <div className="coupon-label">{dragPreview.coupon.label}</div>
            <div className="coupon-partner">{dragPreview.coupon.partner}</div>
          </motion.div>,
          document.body
        )}

      <p className="footer-note">
        쿠폰 조각을 1천원어치 이상 모아 완성된 할인 쿠폰을 만들어 보세요
      </p>
    </div>
  );
}
