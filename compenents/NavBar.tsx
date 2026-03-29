import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const NavBar = () => {
  return (
    <header>
        <nav>
            <Link href='/' className='logo'>
                <Image src='/icons/logo.png' alt='Logo' width={24} height={24} />
                <p>DevEvent</p>
            </Link>
            <ul className='events'>
                <Link href='/'>Home</Link>
                <Link href='/'>Events</Link>
                <Link href='/'>Create Event</Link>
            </ul>
        </nav>
    </header>
  )
}

export default NavBar