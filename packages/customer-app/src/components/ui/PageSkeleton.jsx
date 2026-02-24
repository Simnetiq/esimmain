'use client';

import React from 'react';

/* ── Primitive skeleton blocks ── */

const Block = ({ className = '' }) => (
  <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />
);

const TextLine = ({ width = 'w-full', className = '' }) => (
  <Block className={`h-4 ${width} ${className}`} />
);

const Heading = ({ width = 'w-48', className = '' }) => (
  <Block className={`h-6 ${width} ${className}`} />
);

/* ── Composed skeleton layouts ── */

/** Accordion section skeleton — matches InstallEsimGuide accordion proportions */
export const AccordionSkeleton = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3">
          <Block className="w-9 h-9 rounded-lg" />
          <TextLine width="w-40" />
        </div>
      </div>
    ))}
  </div>
);

/** Section skeleton with heading and body lines */
export const SectionSkeleton = ({ lines = 3 }) => (
  <div className="rounded-xl border border-gray-200 p-5 space-y-4">
    <div className="flex items-center gap-3">
      <Block className="w-9 h-9 rounded-lg" />
      <Heading width="w-36" />
    </div>
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <TextLine key={i} width={i === lines - 1 ? 'w-3/4' : 'w-full'} />
      ))}
    </div>
  </div>
);

/** Blog grid card skeleton — fixed height, matches GridArticleCard proportions */
export const BlogCardSkeleton = () => (
  <div className="flex shrink-0 flex-row items-center gap-3 md:flex-col">
    <div className="w-1/4 shrink-0 grow-0 md:w-full">
      <div className="relative h-0 w-full overflow-hidden pb-[100%]">
        <Block className="absolute inset-0 rounded-none" />
      </div>
    </div>
    <div className="w-full shrink space-y-2 pt-1">
      <Block className="h-5 w-16 rounded-full" />
      <TextLine width="w-full" />
      <TextLine width="w-2/3" />
      <TextLine width="w-20" className="mt-1" />
    </div>
  </div>
);

/** Blog featured skeleton — matches LargeFeaturedCard proportions */
export const BlogFeaturedSkeleton = () => (
  <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
    <div className="min-h-[200px] lg:min-h-[300px]">
      <Block className="w-full h-full min-h-[200px] lg:min-h-[300px] rounded-none" />
    </div>
    <div className="flex flex-col gap-6 md:gap-8">
      {[0, 1].map(i => (
        <div key={i} className="flex flex-row gap-4 items-start">
          <div className="w-1/3 shrink-0">
            <div className="relative h-0 w-full overflow-hidden pb-[100%]">
              <Block className="absolute inset-0 rounded-none" />
            </div>
          </div>
          <div className="flex-1 space-y-2 pt-1">
            <Block className="h-5 w-16 rounded-full" />
            <TextLine width="w-full" />
            <TextLine width="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Blog grid skeleton — 3-column desktop / 1-column mobile, fixed card height */
export const BlogGridSkeleton = ({ count = 6 }) => (
  <div className="grid gap-x-6 gap-y-8 md:grid-cols-2 md:gap-x-8 md:gap-y-10 lg:grid-cols-3">
    {Array.from({ length: count }, (_, i) => (
      <BlogCardSkeleton key={i} />
    ))}
  </div>
);

/** Form field skeleton — matches AccountSettings SettingsField proportions */
export const FormFieldSkeleton = () => (
  <div className="space-y-1.5">
    <TextLine width="w-16" className="h-3" />
    <Block className="h-12 rounded-none" />
  </div>
);

/** Settings card skeleton — flat bg-gray-50 card with icon pill and watermark */
const SettingsCardSkeleton = ({ children }) => (
  <div className="relative bg-gray-50 overflow-hidden p-5">
    <div className="absolute top-3 right-4 w-16 h-20 bg-gray-100/50 rounded animate-pulse" />
    <div className="relative">
      <div className="flex items-center gap-3 mb-4">
        <Block className="w-11 h-11 rounded-lg" />
        <TextLine width="w-32" className="h-3" />
      </div>
      {children}
    </div>
  </div>
);

/** Account settings skeleton — flat cards matching design system */
export const AccountSettingsSkeleton = () => (
  <div className="mx-auto w-full max-w-9xl">
    <div className="mx-auto w-full max-w-7xl">
      <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl space-y-4">
        {/* Personal Info card */}
        <SettingsCardSkeleton>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <FormFieldSkeleton />
          </div>
        </SettingsCardSkeleton>

        {/* Provider card */}
        <SettingsCardSkeleton>
          <TextLine width="w-64" className="h-3" />
        </SettingsCardSkeleton>

        {/* Newsletter card */}
        <SettingsCardSkeleton>
          <TextLine width="w-64" className="h-3 mb-4" />
          <Block className="w-28 h-9 rounded-full" />
        </SettingsCardSkeleton>

        {/* Danger zone card */}
        <SettingsCardSkeleton>
          <TextLine width="w-72" className="h-3 mb-4" />
          <Block className="w-20 h-9 rounded-full" />
        </SettingsCardSkeleton>
      </div>
    </div>
  </div>
);

export default {
  AccordionSkeleton,
  SectionSkeleton,
  BlogCardSkeleton,
  BlogFeaturedSkeleton,
  BlogGridSkeleton,
  FormFieldSkeleton,
  AccountSettingsSkeleton,
};
