/// osm.sol

// Copyright (C) 2018-2020 Maker Ecosystem Growth Holdings, INC.

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pragma solidity >=0.5.10;

import "./median.sol";

contract OSM is LibNote {
    // --- Auth ---
    mapping(address => uint) public wards;

    function rely(address usr) external note auth {
        wards[usr] = 1;
    }

    function deny(address usr) external note auth {
        wards[usr] = 0;
    }

    modifier auth() {
        require(wards[msg.sender] == 1, "OSM/not-authorized");
        _;
    }

    // --- Stop ---
    uint256 public stopped;
    modifier stoppable() {
        require(stopped == 0, "OSM/is-stopped");
        _;
    }

    // --- Math ---
    function add(uint64 x, uint64 y) internal pure returns (uint64 z) {
        z = x + y;
        require(z >= x);
    }

    address public src;
    uint16 constant ONE_HOUR = uint16(3600);
    uint16 public hop = ONE_HOUR;
    uint64 public zzz;

    struct Feed {
        uint128 val;
        uint128 has;
    }

    Feed cur;
    Feed nxt;

    // Whitelisted contracts, set by an auth
    mapping(address => uint256) public bud;

    modifier toll() {
        require(bud[msg.sender] == 1, "OSM/contract-not-whitelisted");
        _;
    }

    event LogValue(bytes32 val);

    constructor(address src_) public {
        wards[msg.sender] = 1;
        src = src_;
    }

    function stop() external note auth {
        stopped = 1;
    }

    function start() external note auth {
        stopped = 0;
    }

    function change(address src_) external note auth {
        src = src_;
    }

    function era() internal view returns (uint) {
        return block.timestamp;
    }

    function prev(uint ts) internal view returns (uint64) {
        require(hop != 0, "OSM/hop-is-zero");
        return uint64(ts - (ts % hop));
    }

    function step(uint16 ts) external auth {
        require(ts > 0, "OSM/ts-is-zero");
        hop = ts;
    }

    function void() external note auth {
        cur = nxt = Feed(0, 0);
        stopped = 1;
    }

    function pass() public view returns (bool ok) {
        console.log("block timestamp", block.timestamp);
        console.log("zzz+hop", add(zzz, hop));
        return era() >= add(zzz, hop);
    }

    function poke() external note stoppable {
        require(pass(), "OSM/not-passed");
        (uint256 wut, bool ok) = Median(src).peek();
        console.log("ok", ok);
        if (ok) {
            cur = nxt;
            nxt = Feed(uint128(wut), 1);
            zzz = prev(era());
            console.log("cur.val", cur.val);
            emit LogValue(bytes32(uint(cur.val)));
        }
    }

    function peek() external view toll returns (bytes32, bool) {
        console.log("cur.has", cur.has);
        return (bytes32(uint(cur.val)), cur.has == 1);
    }

    function peep() external view toll returns (bytes32, bool) {
        return (bytes32(uint(nxt.val)), nxt.has == 1);
    }

    function read() external view toll returns (bytes32) {
        require(cur.has == 1, "OSM/no-current-value");
        return (bytes32(uint(cur.val)));
    }

    function kiss(address a) external note auth {
        require(a != address(0), "OSM/no-contract-0");
        bud[a] = 1;
    }

    function diss(address a) external note auth {
        bud[a] = 0;
    }

    function kisses(address[] calldata a) external note auth {
        for (uint i = 0; i < a.length; i++) {
            require(a[i] != address(0), "OSM/no-contract-0");
            bud[a[i]] = 1;
        }
    }

    function diss(address[] calldata a) external note auth {
        for (uint i = 0; i < a.length; i++) {
            bud[a[i]] = 0;
        }
    }
}
