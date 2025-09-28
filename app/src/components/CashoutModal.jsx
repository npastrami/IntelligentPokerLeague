import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

export default function CashoutModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  buyInAmount, 
  currentStack, 
  loading 
}) {
  const profit = currentStack - buyInAmount
  const isProfit = profit > 0

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                    <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                      Cash Out Confirmation
                    </Dialog.Title>
                    <div className="mt-4 space-y-3">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Buy-in Amount:</span>
                          <span className="font-medium text-gray-900">${buyInAmount?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Current Stack:</span>
                          <span className="font-medium text-gray-900">${currentStack?.toLocaleString() || 0}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">
                              {isProfit ? 'Profit:' : 'Loss:'}
                            </span>
                            <span className={`font-bold ${
                              isProfit ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {isProfit ? '+' : ''}${profit?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Are you sure you want to leave this poker session? Your current stack of ${currentStack?.toLocaleString() || 0} will be added to your coin balance.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-[#ff3131] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onConfirm}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Leave & Cash Out'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Continue Playing
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}