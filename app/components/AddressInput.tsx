"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import Select from "react-select";

interface AddressValue {
  province_code?: string;
  province_name?: string;
  ward_code?: string;
  ward_name?: string;
  street?: string;
  full_address?: string; // Tương thích ngược với ô text
}

interface AddressInputProps {
  label: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
}

export default function AddressInput({
  label,
  value,
  onChange,
}: AddressInputProps) {
  const [provinces, setProvinces] = useState<
    { label: string; value: string }[]
  >([]);
  const [wards, setWards] = useState<{ label: string; value: string }[]>([]);

  // Legacy mode check
  const isLegacy = !value.province_code && !!value.full_address;

  useEffect(() => {
    api.get("/geo/provinces").then((res) => {
      const data = res.data?.data || [];
      setProvinces(
        data.map((p: { name: string; code: string }) => ({
          label: p.name,
          value: p.code,
        })),
      );
    });
  }, []);

  useEffect(() => {
    if (value.province_code) {
      api.get(`/geo/wards?province_code=${value.province_code}`).then((res) => {
        const data = res.data?.data || [];
        setWards(
          data.map((w: { name: string; code: string }) => ({
            label: w.name,
            value: w.code,
          })),
        );
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWards([]);
    }
  }, [value.province_code]);

  const updateField = (changes: Partial<AddressValue>) => {
    const newVal = { ...value, ...changes };
    const curProv = provinces.find((p) => p.value === newVal.province_code);
    const curWard = wards.find((w) => w.value === newVal.ward_code);

    const pName = newVal.province_name || curProv?.label || "";
    const wName = newVal.ward_name || curWard?.label || "";
    const st = newVal.street || "";

    newVal.province_name = pName;
    newVal.ward_name = wName;

    // Auto assemble full address
    let full = st;
    if (wName) full += (full ? ", " : "") + wName;
    if (pName) full += (full ? ", " : "") + pName;

    newVal.full_address = full;
    onChange(newVal);
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-slate-500 mb-1">
        {label}
      </label>

      {isLegacy ? (
        <div className="text-xs space-y-1">
          <textarea
            disabled
            rows={2}
            className="block w-full px-3 py-2 bg-slate-100 border border-slate-250 text-slate-500 text-xs rounded-lg outline-none resize-none"
            value={value.full_address}
          />
          <button
            type="button"
            onClick={() =>
              onChange({
                street: value.full_address,
                full_address: value.full_address,
              })
            }
            className="text-[10px] text-blue-500 hover:underline"
          >
            Nâng cấp lên địa chỉ chuẩn (2 cấp)
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Select
              placeholder="Chọn Tỉnh/Thành..."
              options={provinces}
              value={
                provinces.find((p) => p.value === value.province_code) || null
              }
              onChange={(selected) =>
                updateField({
                  province_code: selected?.value,
                  province_name: selected?.label,
                  ward_code: "",
                  ward_name: "",
                })
              }
              className="text-xs"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: "34px",
                  borderRadius: "0.5rem",
                }),
              }}
            />

            <Select
              placeholder="Chọn Xã/Phường..."
              options={wards}
              value={wards.find((w) => w.value === value.ward_code) || null}
              onChange={(selected) =>
                updateField({
                  ward_code: selected?.value,
                  ward_name: selected?.label,
                })
              }
              isDisabled={!value.province_code}
              className="text-xs"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: "34px",
                  borderRadius: "0.5rem",
                }),
              }}
              isSearchable
            />
          </div>
          <input
            type="text"
            placeholder="Số nhà, tên đường..."
            className="block w-full px-3 py-2 bg-white border border-slate-250 text-slate-800 text-xs rounded-lg focus:border-blue-500 outline-none"
            value={value.street || ""}
            onChange={(e) => updateField({ street: e.target.value })}
            required
          />
        </>
      )}
    </div>
  );
}
