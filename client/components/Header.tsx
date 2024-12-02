import { Pacifico } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
const herofont = Pacifico({
    subsets:['latin'],
    weight:['400']
})

export const Header = () => {
  return (
    <div className="flex justify-between  max-w-[1400px] xl:px-10 mx-auto items-center relative z-20">
        <Link href="/" className="cursor-pointer">
          <h1 className={` ${herofont.className} text-white text-4xl font-semibold`}>Googuessy</h1>
        </Link>
        <a href="https://www.instagram.com/jaskaransingh7000/" target='_blank'>
          <button className="group/button relative inline-flex items-center justify-center overflow-hidden rounded-md bg-transparent backdrop-blur-lg px-6 py-2 text-base font-semibold text-white transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl hover:shadow-gray-600/50 border border-white/20">
            <Image src="/speak.png" width={40} height={40} alt="" />
            <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
              <div className="relative h-full w-10 bg-white/20"></div>
            </div>
          </button>
        </a>
      </div>
  )
}

export default Header
